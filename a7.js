'use strict';
// ---------- net volume + fixed range volume profile ----------
const nvSeries = chart.addSeries(LWC.HistogramSeries, {priceScaleId:'nv', priceFormat:{type:'volume'}, lastValueVisible:false, priceLineVisible:false});
chart.priceScale('nv').applyOptions({scaleMargins:{top:0.82, bottom:0}, visible:false});
let nvMode = '';
function fmtVol(v){ const a=Math.abs(v); return (v<0?'-':'')+(a>=1e6?(a/1e6).toFixed(2)+'M':a>=1e3?(a/1e3).toFixed(2)+'K':a.toFixed(a<10?3:1)); }
function applyNV(){
  if(!S.nv || !bars.length){ nvSeries.setData([]); series.priceScale().applyOptions({scaleMargins:{top:0.08,bottom:0.08}}); return; }
  series.priceScale().applyOptions({scaleMargins:{top:0.08,bottom:0.24}});
  const taker = bars.every(b => b.tb!=null);
  nvMode = taker ? 'gerçek delta' : 'TV formülü';
  const out = [];
  for(let i=0;i<bars.length;i++){
    const b = bars[i]; let v;
    if(taker) v = 2*b.tb - b.vol;
    else { if(i===0) continue; const ch = b.close - bars[i-1].close; v = ch>0 ? b.vol : ch<0 ? -b.vol : 0; }
    out.push({time:b.time, value:v, color: v>=0 ? 'rgba(38,166,154,0.65)' : 'rgba(239,83,80,0.65)'});
  }
  nvSeries.setData(out);
}

const LTFS = [['1m','1dk',60],['5m','5dk',300],['15m','15dk',900],['1h','1s',3600],['4h','4s',14400],['1d','1G',86400]];
const vpCache = new Map();
function toUTCms(t){ return (S.tz==='local' ? t + new Date(t*1000).getTimezoneOffset()*60 : t) * 1000; }
async function fetchRange(s, iv, ivSec, startMs, endMs){
  const off = +S.off[S.sym] || 0, out = [];
  if(s.kind === 'binance'){
    let from = startMs;
    for(let page=0; page<6 && from<endMs; page++){
      const r = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${s.sym}&interval=${iv}&startTime=${from}&endTime=${endMs-1}&limit=1500`);
      const j = await r.json(); if(!Array.isArray(j)) throw new Error(j.msg || ('HTTP '+r.status));
      if(!j.length) break;
      j.forEach(k => out.push({t:k[0], o:+k[1]+off, h:+k[2]+off, l:+k[3]+off, c:+k[4]+off, v:+k[5], tb:+k[9]}));
      from = j[j.length-1][0] + ivSec*1000; if(j.length < 1500) break;
    }
  } else {
    const r = await fetch('https://api.hyperliquid.xyz/info', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({type:'candleSnapshot', req:{coin:s.sym, interval:iv, startTime:startMs, endTime:endMs-1}})});
    const j = await r.json(); if(!Array.isArray(j)) throw new Error((j && (j.error||j.msg)) || ('HTTP '+r.status));
    j.forEach(c => out.push({t:c.t, o:+c.o+off, h:+c.h+off, l:+c.l+off, c:+c.c+off, v:+c.v, tb:null}));
  }
  return out.filter(b => b.t >= startMs && b.t < endMs);
}
function computeVP(lt, rows, va){
  let lo = Infinity, hi = -Infinity;
  for(const b of lt){ if(b.l<lo) lo=b.l; if(b.h>hi) hi=b.h; }
  if(!(hi>lo)) hi = lo + 1e-6;
  const step = (hi-lo)/rows, up = new Array(rows).fill(0), dn = new Array(rows).fill(0);
  for(const b of lt){
    const bu = b.tb!=null ? b.tb : (b.c>=b.o ? b.v : 0), bd = b.v - bu;
    if(!(b.h>b.l)){ const r = Math.min(rows-1, Math.max(0, Math.floor((b.c-lo)/step))); up[r]+=bu; dn[r]+=bd; continue; }
    const r0 = Math.max(0, Math.floor((b.l-lo)/step)), r1 = Math.min(rows-1, Math.floor((b.h-lo)/step));
    for(let r=r0; r<=r1; r++){
      const rl = lo + r*step, ov = Math.min(rl+step, b.h) - Math.max(rl, b.l);
      if(ov <= 0) continue; const f = ov/(b.h-b.l); up[r]+=bu*f; dn[r]+=bd*f;
    }
  }
  const tot = up.map((u,i)=>u+dn[i]), sum = tot.reduce((a,b)=>a+b,0);
  let poc = 0; for(let i=1;i<rows;i++) if(tot[i]>tot[poc]) poc=i;
  let a = poc, z = poc, acc = tot[poc]; const target = sum*va;
  while(acc < target && (a>0 || z<rows-1)){
    const above = (z+1<rows?tot[z+1]:0) + (z+2<rows?tot[z+2]:0), below = (a-1>=0?tot[a-1]:0) + (a-2>=0?tot[a-2]:0);
    if((above >= below && z<rows-1) || a===0){ for(let k=0;k<2 && z<rows-1;k++){ z++; acc+=tot[z]; } }
    else { for(let k=0;k<2 && a>0;k++){ a--; acc+=tot[a]; } }
  }
  return {lo, hi, step, up, dn, tot, sum, poc, vaLo:a, vaHi:z, rows};
}
