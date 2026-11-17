'use strict';
const LWC = window.LightweightCharts;

// ---------- storage ----------
const mem = {}; let storageOk = true;
const store = {
  get(k, d){ try{ const v = localStorage.getItem('gx_'+k); return v==null ? (k in mem ? mem[k] : d) : JSON.parse(v); }catch(e){ storageOk=false; return k in mem ? mem[k] : d; } },
  set(k, v){ mem[k]=v; try{ localStorage.setItem('gx_'+k, JSON.stringify(v)); }catch(e){ storageOk=false; } }
};
const S = Object.assign({ema20:true, ema50:true, tf:'15m', sym:'XAUUSD', magnet:true, color:'#f5c542', off:{XAUUSD:0, US100:0}}, store.get('settings', {}));
if(!S.off) S.off = {XAUUSD:0, US100:0};
const saveS = () => store.set('settings', S);

const TFS = [['1m','1dk',60],['5m','5dk',300],['15m','15dk',900],['30m','30dk',1800],['1h','1s',3600],['4h','4s',14400],['1d','1G',86400]];
if(!TFS.some(x=>x[0]===S.tf)) S.tf = '15m';
const COLORS = ['#f5c542','#2962ff','#ef5350','#26a69a','#e040fb','#ffffff'];

// ---------- DOM ----------
const $ = id => document.getElementById(id);
const wrap = $('wrap'), ov = $('ov'), ctx = ov.getContext('2d'), statusEl = $('status'), pxEl = $('px'), legend = $('legend');
function setStatus(msg, err){ statusEl.textContent = msg; statusEl.classList.toggle('err', !!err); }

const tfSel = $('tf');
TFS.forEach(([v,l]) => { const o=document.createElement('option'); o.value=v; o.textContent=l; tfSel.appendChild(o); });
tfSel.value = S.tf;

// ---------- chart ----------
const chart = LWC.createChart($('chart'), {
  autoSize: true,
  layout: { background:{type:'solid', color:'#0f1115'}, textColor:'#aab2c0', fontSize:11 },
  grid: { vertLines:{color:'#191d26'}, horzLines:{color:'#191d26'} },
  rightPriceScale: { borderColor:'#2a2f3a', scaleMargins:{top:0.08, bottom:0.08} },
  timeScale: { borderColor:'#2a2f3a', timeVisible:true, secondsVisible:false, rightOffset:10 },
  crosshair: { mode: LWC.CrosshairMode.Normal },
});
const series = chart.addSeries(LWC.CandlestickSeries, { upColor:'#26a69a', downColor:'#ef5350', borderVisible:false, wickUpColor:'#26a69a', wickDownColor:'#ef5350' });
const lineOpts = { lineWidth:1, priceLineVisible:false, lastValueVisible:false, crosshairMarkerVisible:false };
const ema20 = chart.addSeries(LWC.LineSeries, Object.assign({color:'#f5c542'}, lineOpts));
const ema50 = chart.addSeries(LWC.LineSeries, Object.assign({color:'#4aa3ff'}, lineOpts));


function ema(period){
  const out=[]; const k=2/(period+1); let e=null;
  for(let i=0;i<bars.length;i++){ const c=bars[i].close; e = e==null ? c : c*k + e*(1-k); if(i>=period-1) out.push({time:bars[i].time, value:e}); }
  return out;
}
function applyEMAs(){
  ema20.setData(S.ema20 ? ema(20) : []); ema50.setData(S.ema50 ? ema(50) : []);
}
function fmt(p){ return p==null||isNaN(p) ? '—' : p.toFixed(2); }
function updatePx(){
  if(!bars.length){ pxEl.textContent='—'; return; }
  const a=bars[bars.length-1], b=bars[bars.length-2]||a;
  pxEl.textContent = fmt(a.close); pxEl.style.color = a.close>=b.close ? '#26a69a' : '#ef5350';
}
chart.subscribeCrosshairMove(param => {
  const d = param && param.time ? param.seriesData.get(series) : null;
  const b = d || bars[bars.length-1];
  legend.textContent = b ? `A ${fmt(b.open)}  Y ${fmt(b.high)}  D ${fmt(b.low)}  K ${fmt(b.close)}` : '';
});
