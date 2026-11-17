'use strict';
// ---------- data ----------
const SOURCES = {
  XAUUSD: [ {name:'Binance XAUUSDT', kind:'binance', sym:'XAUUSDT'}, {name:'Hyperliquid xyz:GOLD', kind:'hl', sym:'xyz:GOLD'} ],
  US100:  [ {name:'Hyperliquid xyz:XYZ100', kind:'hl', sym:'xyz:XYZ100'} ],
};
function mk(ms, o, h, l, c){
  const off = +S.off[S.sym] || 0;
  // chart shows wall-clock local time
  return { time: Math.round(ms/1000) - new Date(ms).getTimezoneOffset()*60, open:+o+off, high:+h+off, low:+l+off, close:+c+off };
}
async function fetchHist(src, iv, count){
  let rows;
  if(src.kind === 'binance'){
    const r = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${src.sym}&interval=${iv}&limit=${count}`);
    const j = await r.json();
    if(!Array.isArray(j)) throw new Error(j.msg || ('HTTP '+r.status));
    rows = j.map(k => mk(k[0], k[1], k[2], k[3], k[4]));
  } else {
    const end = Date.now(), start = end - count*tfSec*1000;
    const r = await fetch('https://api.hyperliquid.xyz/info', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({type:'candleSnapshot', req:{coin:src.sym, interval:iv, startTime:start, endTime:end}})});
    const j = await r.json();
    if(!Array.isArray(j)) throw new Error((j && (j.error||j.msg)) || ('HTTP '+r.status));
    rows = j.map(c => mk(c.t, c.o, c.h, c.l, c.c));
  }
  if(!rows.length) throw new Error('boş yanıt');
  const m = new Map(); rows.forEach(b => m.set(b.time, b));
  return [...m.values()].sort((a,b)=>a.time-b.time);
}

let bars = [], tfSec = 900, src = null, lastUpdate = null, liveOk = false;
let ws = null, reconnectT = null, pollT = null, pingT = null, emaT = null;
function stopLive(){
  clearTimeout(reconnectT); clearInterval(pollT); clearInterval(pingT); liveOk = false;
  if(ws){ ws.onclose = ws.onmessage = ws.onerror = null; try{ ws.close(); }catch(e){} ws = null; }
}
function applyBar(b){
  const last = bars[bars.length-1];
  if(!last || b.time < last.time) return;
  if(b.time === last.time) bars[bars.length-1] = b; else bars.push(b);
  series.update(b); updatePx(); lastUpdate = new Date(); dirty = true;
  if(!emaT) emaT = setTimeout(() => { emaT = null; applyEMAs(); }, 1000);
}
function startLive(s, iv, seq){
  stopLive();
  const url = s.kind==='binance' ? `wss://fstream.binance.com/ws/${s.sym.toLowerCase()}@kline_${iv}` : 'wss://api.hyperliquid.xyz/ws';
  try{ ws = new WebSocket(url); }catch(e){ ws = null; }
  if(ws){
    ws.onopen = () => {
      if(s.kind==='hl'){ ws.send(JSON.stringify({method:'subscribe', subscription:{type:'candle', coin:s.sym, interval:iv}})); pingT = setInterval(() => { try{ ws.send('{"method":"ping"}'); }catch(e){} }, 30000); }
      liveOk = true; showDataStatus();
    };
    ws.onmessage = ev => {
      if(seq !== loadSeq) return;
      let m; try{ m = JSON.parse(ev.data); }catch(e){ return; }
      if(m.e==='kline' && m.k) applyBar(mk(m.k.t, m.k.o, m.k.h, m.k.l, m.k.c));
      else if(m.channel==='candle' && m.data){
        const list = Array.isArray(m.data) ? m.data : [m.data];
        for(const d of list) if(d.s===s.sym && d.i===iv) applyBar(mk(d.t, d.o, d.h, d.l, d.c));
      }
      showDataStatus();
    };
    ws.onclose = () => { liveOk = false; clearInterval(pingT); if(seq===loadSeq){ showDataStatus(); reconnectT = setTimeout(() => startLive(s, iv, seq), 5000); } };
  }
  // REST fallback while the socket is down
  pollT = setInterval(async () => {
    if(liveOk || document.hidden || seq!==loadSeq) return;
    try{ const nb = await fetchHist(s, iv, 3); if(seq===loadSeq){ nb.forEach(applyBar); showDataStatus(); } }catch(e){}
  }, 15000);
}
let loadSeq = 0;
async function load(){
  const seq = ++loadSeq;
  stopLive();
  tfSec = TFS.find(x=>x[0]===S.tf)[2];
  document.querySelectorAll('#syms button').forEach(b=>b.classList.toggle('on', b.dataset.sym===S.sym));
  setStatus('Yükleniyor…');
  let got = null, errs = [];
  for(const s of SOURCES[S.sym]){
    try{ got = await fetchHist(s, S.tf, 1500); src = s; break; }
    catch(e){ errs.push(s.name+': '+e.message); }
  }
  if(seq !== loadSeq) return;
  drawings = store.get('draw_'+S.sym, []); sel = null; pending = null;
  if(!got){
    bars = []; series.setData([]); applyEMAs(); updatePx(); src = null;
    setMode('cursor');
    const netBlocked = errs.every(e => /fetch|network|load failed|NetworkError/i.test(e));
    setStatus(netBlocked
      ? 'İnternete bağlanılamadı. Claude uygulamasının dosya önizlemesi internete izin vermez: dosyayı indirip Chrome ile aç. Chrome\'daysan bağlantını kontrol edip ⟳ bas.'
      : 'Veri alınamadı, ⟳ ile tekrar dene — ' + errs.join(' | '), true);
    dirty = true; return;
  }
  bars = got; lastUpdate = new Date();
  series.setData(bars); applyEMAs(); updatePx();
  chart.timeScale().setVisibleLogicalRange({from: Math.max(0,bars.length-120), to: bars.length+10});
  setMode('cursor');
  showDataStatus();
  startLive(src, S.tf, seq);
  dirty = true;
}
function showDataStatus(){
  if(!src || mode!=='cursor' || sel) return;
  const t = lastUpdate ? lastUpdate.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) : '';
  const off = +S.off[S.sym] ? ` · fark ${S.off[S.sym] > 0 ? '+' : ''}${S.off[S.sym]}` : '';
  setStatus(`${src.name} · ${TFS.find(x=>x[0]===S.tf)[1]} · ${liveOk ? '● canlı' : '○ 15 sn yenileme'} · ${t}${off}`);
}
document.addEventListener('visibilitychange', () => { if(!document.hidden && src && !liveOk) load(); });
