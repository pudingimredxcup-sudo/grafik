'use strict';
async function vpCompute(d){
  const s = src; if(!s || !bars.length) throw new Error('veri yok');
  const tA = Math.min(d.pts[0].t, d.pts[1].t), tB = Math.max(d.pts[0].t, d.pts[1].t);
  const la = t2l(tA), lb = t2l(tB);
  const start = (la>=0 && la<bars.length) ? bars[Math.floor(la)].time : tA;
  const end = ((lb>=0 && lb<bars.length) ? bars[Math.floor(lb)].time : tB) + tfSec;
  const startMs = toUTCms(start), endMs = toUTCms(end);
  let lt = null, used = 'grafik';
  for(const [iv, lab, sec] of LTFS){
    if(sec > tfSec) break;
    const n = (endMs-startMs)/1000/sec;
    const ok = s.kind==='binance' ? n <= 7500 : (n <= 4900 && startMs >= Date.now() - 4900*sec*1000);
    if(!ok) continue;
    try{ const r = await fetchRange(s, iv, sec, startMs, endMs); if(r.length){ lt = r; used = lab; break; } }catch(e){}
  }
  if(!lt){ lt = bars.filter(b => b.time>=start && b.time<end).map(b => ({o:b.open, h:b.high, l:b.low, c:b.close, v:b.vol||0, tb:b.tb})); }
  if(!lt.length) throw new Error('aralıkta mum yok');
  const res = computeVP(lt, Math.max(4, Math.min(200, +S.vpRows||24)), Math.max(0.1, Math.min(1, (+S.vpVA||70)/100)));
  res.ltf = used; res.n = lt.length; res.taker = lt.every(b=>b.tb!=null); return res;
}
function vpKey(d){ return [S.sym, S.tz, S.off[S.sym], S.vpRows, S.vpVA, src && src.sym, d.pts.map(p=>Math.round(p.t)+':'+p.p.toFixed(5)).join('|')].join('/'); }
function vpGet(d){
  const k = vpKey(d); let st = vpCache.get(k);
  if(!st){ st = {status:'loading'}; vpCache.set(k, st); vpCompute(d).then(r => { st.status='ok'; st.res=r; dirty=true; }).catch(e => { st.status='err'; st.msg=e.message; dirty=true; }); }
  return st;
}
function vpBounds(d){
  const st = vpCache.get(vpKey(d));
  if(st && st.status==='ok') return {y0: series.priceToCoordinate(st.res.hi), y1: series.priceToCoordinate(st.res.lo)};
  const a = series.priceToCoordinate(d.pts[0].p), b = series.priceToCoordinate(d.pts[1].p); return {y0: Math.min(a,b), y1: Math.max(a,b)};
}
function drawVP(d, P, W, isSel){
  const x0 = Math.min(P[0].x, P[1].x), x1 = Math.max(P[0].x, P[1].x, x0+20);
  ctx.save(); ctx.setLineDash([3,3]); ctx.strokeStyle = 'rgba(180,190,210,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x0,0); ctx.lineTo(x0,99999); ctx.moveTo(x1,0); ctx.lineTo(x1,99999); ctx.stroke(); ctx.restore();
  const yTop = Math.min(P[0].y, P[1].y);
  if(d.preview || (drag && drag.d===d)){ label('FRVP: bırakınca hesaplanır', x0+2, yTop-10, '#2a2f3a', '#fff'); return; }
  const st = vpGet(d);
  if(st.status !== 'ok'){ label(st.status==='err' ? 'FRVP hata: '+st.msg : 'FRVP hesaplanıyor…', x0+2, yTop-10, '#2a2f3a', '#fff'); return; }
  const r = st.res, maxT = Math.max(...r.tot) || 1, width = Math.max(30, (x1-x0)*0.3);
  for(let i=0;i<r.rows;i++){
    const yt = series.priceToCoordinate(r.lo+(i+1)*r.step), yb = series.priceToCoordinate(r.lo+i*r.step);
    if(yt==null || yb==null) continue;
    const h = Math.max(1, yb-yt-1), inVA = i>=r.vaLo && i<=r.vaHi, wu = width*r.up[i]/maxT, wd = width*r.dn[i]/maxT;
    ctx.fillStyle = inVA ? 'rgba(21,146,230,0.70)' : 'rgba(21,146,230,0.30)'; ctx.fillRect(x0, yt, wu, h);
    ctx.fillStyle = inVA ? 'rgba(251,193,35,0.70)' : 'rgba(251,193,35,0.30)'; ctx.fillRect(x0+wu, yt, wd, h);
  }
  const pocP = r.lo + (r.poc+0.5)*r.step, vah = r.lo + (r.vaHi+1)*r.step, val = r.lo + r.vaLo*r.step;
  const line = (p, col, dash) => { const y = series.priceToCoordinate(p); if(y==null) return null; ctx.save(); ctx.setLineDash(dash); ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y); ctx.stroke(); ctx.restore(); return y; };
  const yp = line(pocP, '#ff3b30', []), yh = line(vah, '#4aa3ff', [4,3]), yl = line(val, '#4aa3ff', [4,3]);
  if(yp!=null) label('POC '+fmt(pocP), x1-2, yp, '#ff3b30', '#fff', 'right');
  if(yh!=null) label('VAH '+fmt(vah), x1-2, yh, '#1f4f80', '#fff', 'right');
  if(yl!=null) label('VAL '+fmt(val), x1-2, yl, '#1f4f80', '#fff', 'right');
  const yH = series.priceToCoordinate(r.hi);
  label(`FRVP ${r.ltf} veri · ${r.rows} satır · VA %${Math.round(+S.vpVA||70)}${r.taker?' · alış/satış':''}`, x0+2, (yH!=null?yH:yTop)-10, '#2a2f3a', '#fff');
}
