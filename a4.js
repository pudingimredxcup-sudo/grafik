'use strict';
// ---------- drawings ----------
let drawings = [], sel = null, pending = null, hover = null, mode = 'cursor', drag = null, dirty = true, paneW = 9999, axisLabels = [];
const NEED = {trend:2, ray:2, hline:1, rect:2, fib:2, pos:2, vp:2};
const FIBS = [-0.62,-0.27,0,0.236,0.382,0.5,0.618,0.705,0.786,1];
const saveDrawings = () => store.set('draw_'+S.sym, drawings);
const uid = () => Math.random().toString(36).slice(2,9);

function paneSize(){ const s = chart.paneSize(0); return {w:s.width, h:s.height}; }
function handlesOf(d){
  if(d.type==='hline') return [toXY(d.pts[0])];
  if(d.type==='pos'){ const e=toXY(d.pts[0]); const xr=toXY(d.pts[1]).x; return [e, {x:xr, y:series.priceToCoordinate(d.pts[1].p)}, {x:xr, y:series.priceToCoordinate(d.pts[2].p)}]; }
  return d.pts.map(toXY);
}
function hexA(c, a){ const n=parseInt(c.slice(1),16); return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`; }
function label(text, x, y, bg, fg, align){
  ctx.font = '11px -apple-system,Segoe UI,Roboto,sans-serif';
  const w = ctx.measureText(text).width + 8; let lx = align==='right' ? x-w : x;
  if(align!=='axis') lx = Math.max(2, Math.min(lx, paneW - w - 2));
  ctx.fillStyle = bg; ctx.fillRect(lx, y-8, w, 16); ctx.fillStyle = fg; ctx.textBaseline='middle'; ctx.fillText(text, lx+4, y);
}
function drawOne(d, W, isSel){
  const c = d.color || '#f5c542'; ctx.strokeStyle = c; ctx.lineWidth = isSel ? 2 : 1.5; ctx.setLineDash([]);
  const P = d.pts.map(toXY);
  if(P.some(p => p.x==null || p.y==null)) return;
  if(d.type==='vp'){ drawVP(d, P, W, isSel); }
  else if(d.type==='trend' || d.type==='ray'){
    let [a,b] = P; if(!b) return;
    let bx=b.x, by=b.y;
    if(d.type==='ray' && Math.abs(b.x-a.x)>0.5){ const ex = b.x>a.x ? W : 0; by = a.y + (b.y-a.y)*(ex-a.x)/(b.x-a.x); bx = ex; }
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(bx,by); ctx.stroke();
  } else if(d.type==='hline'){
    const y=P[0].y; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
    axisLabels.push([fmt(d.pts[0].p), y, c]);
  } else if(d.type==='rect'){
    const [a,b]=P; if(!b) return;
    ctx.fillStyle = hexA(c, 0.14); ctx.fillRect(Math.min(a.x,b.x), Math.min(a.y,b.y), Math.abs(b.x-a.x), Math.abs(b.y-a.y));
    ctx.strokeRect(Math.min(a.x,b.x), Math.min(a.y,b.y), Math.abs(b.x-a.x), Math.abs(b.y-a.y));
  } else if(d.type==='fib'){
    const [a,b]=P; if(!b) return;
    const p1=d.pts[0].p, p2=d.pts[1].p; let x0=Math.min(a.x,b.x), x1=Math.max(a.x,b.x); if(x1-x0<80) x1=x0+80;
    const yAt = L => series.priceToCoordinate(p2 + (p1-p2)*L);
    const y618=yAt(0.618), y786=yAt(0.786);
    ctx.fillStyle = hexA(c, 0.10); ctx.fillRect(x0, Math.min(y618,y786), x1-x0, Math.abs(y786-y618));
    ctx.setLineDash([4,3]); ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); ctx.setLineDash([]);
    for(const L of FIBS){
      const y=yAt(L); if(y==null) continue;
      ctx.strokeStyle = (L===0||L===1) ? c : hexA(c, L<0 ? 0.9 : 0.6); ctx.lineWidth = isSel?1.5:1;
      ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y); ctx.stroke();
      ctx.fillStyle = c; ctx.font='10px -apple-system,Segoe UI,Roboto,sans-serif'; ctx.textBaseline='bottom';
      ctx.fillText(`${L} (${fmt(p2+(p1-p2)*L)})`, x0+2, y-1);
    }
  } else if(d.type==='pos'){
    const e=P[0], xr=P[1].x; const ye=e.y, ys=series.priceToCoordinate(d.pts[1].p), yt=series.priceToCoordinate(d.pts[2].p);
    const x0=Math.min(e.x,xr), w=Math.max(Math.abs(xr-e.x), 30);
    ctx.fillStyle='rgba(38,166,154,0.22)'; ctx.fillRect(x0, Math.min(ye,yt), w, Math.abs(yt-ye));
    ctx.fillStyle='rgba(239,83,80,0.22)'; ctx.fillRect(x0, Math.min(ye,ys), w, Math.abs(ys-ye));
    ctx.strokeStyle='#c9ced6'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x0,ye); ctx.lineTo(x0+w,ye); ctx.stroke();
    const en=d.pts[0].p, st=d.pts[1].p, tg=d.pts[2].p; const risk=Math.abs(en-st); const rr = risk ? Math.abs(tg-en)/risk : 0;
    const dir = st<en ? 'LONG' : 'SHORT';
    label(`${dir}  R:R ${rr.toFixed(2)}  giriş ${fmt(en)}`, x0+2, ye + (st<en ? -10 : 10), '#2a2f3a', '#fff');
    label(`Hedef ${fmt(tg)} (${fmt(Math.abs(tg-en))})`, x0+2, yt + (yt<ye ? 10 : -10), '#1f6f66', '#fff');
    label(`Stop ${fmt(st)} (${fmt(risk)})`, x0+2, ys + (ys>ye ? -10 : 10), '#8e2f2d', '#fff');
  }
  if(isSel){
    for(const h of handlesOf(d)){ if(h.x==null||h.y==null) continue; ctx.beginPath(); ctx.arc(h.x,h.y,6,0,Math.PI*2); ctx.fillStyle='#0f1115'; ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke(); }
  }
}
function render(){
  const r = wrap.getBoundingClientRect(), dpr = window.devicePixelRatio||1;
  if(ov.width !== Math.round(r.width*dpr) || ov.height !== Math.round(r.height*dpr)){ ov.width=Math.round(r.width*dpr); ov.height=Math.round(r.height*dpr); }
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,r.width,r.height);
  if(!bars.length) return;
  const {w,h} = paneSize(); paneW = w; axisLabels = [];
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,w,h); ctx.clip();
  for(const d of drawings) drawOne(d, w, d.id===sel);
  if(pending){
    const pts = pending.pts.slice(); if(hover) pts.push(hover);
    if(pts.length >= NEED[pending.type]){ const pd = buildDrawing(pending.type, pts, pending.color); pd.preview = true; drawOne(pd, w, false); }
    for(const p of pending.pts){ const q=toXY(p); if(q.x==null) continue; ctx.beginPath(); ctx.arc(q.x,q.y,5,0,Math.PI*2); ctx.fillStyle=pending.color; ctx.fill(); }
  }
  ctx.restore();
  // horizontal-line prices on the price axis, like TradingView
  ctx.save(); ctx.beginPath(); ctx.rect(w,0,r.width-w,h); ctx.clip();
  for(const [t,y,c] of axisLabels){ if(y<0||y>h) continue; ctx.font='11px -apple-system,Segoe UI,Roboto,sans-serif'; ctx.fillStyle=c; ctx.fillRect(w,y-9,r.width-w,18); ctx.fillStyle='#000'; ctx.textBaseline='middle'; ctx.fillText(t, w+6, y); }
  ctx.restore();
}
function buildDrawing(type, pts, color){
  const d = {id:uid(), type, color, pts: pts.slice(0, NEED[type]).map(p=>({t:p.t, p:p.p}))};
  if(type==='pos'){
    const en=d.pts[0].p, st=d.pts[1].p; let rt=d.pts[1].t;
    if(rt <= d.pts[0].t) rt = l2t(t2l(d.pts[0].t)+20);
    d.pts[1].t = rt; d.pts.push({t:rt, p: en + 2*(en-st)}); d.color = '#c9ced6';
  }
  return d;
}
// redraw only when the chart geometry changed
let sig = '';
function loop(){
  if(bars.length){
    const ps = paneSize();
    const s = [ts.logicalToCoordinate(0), ts.logicalToCoordinate(1), series.priceToCoordinate(bars[0].close), series.priceToCoordinate(bars[0].close*1.01), ps.w, ps.h, wrap.clientWidth, wrap.clientHeight].join('|');
    if(s!==sig || dirty){ sig=s; dirty=false; render(); }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
