'use strict';
// ---------- hit testing ----------
function distSeg(px,py,a,b){ const dx=b.x-a.x, dy=b.y-a.y; const L=dx*dx+dy*dy; let t=L?((px-a.x)*dx+(py-a.y)*dy)/L:0; t=Math.max(0,Math.min(1,t)); return Math.hypot(px-(a.x+t*dx), py-(a.y+t*dy)); }
function hit(d, x, y){
  const W = paneSize().w, P = d.pts.map(toXY), tol = 14;
  if(P.some(p=>p.x==null||p.y==null)) return false;
  if(d.type==='hline') return Math.abs(y-P[0].y) < tol;
  if(d.type==='trend') return distSeg(x,y,P[0],P[1]) < tol;
  if(d.type==='ray'){ const a=P[0], b=P[1]; if(Math.abs(b.x-a.x)<0.5) return distSeg(x,y,a,b)<tol; const ex=b.x>a.x?W:0; return distSeg(x,y,a,{x:ex,y:a.y+(b.y-a.y)*(ex-a.x)/(b.x-a.x)})<tol; }
  let x0,x1,y0,y1;
  if(d.type==='pos'){ const ys=series.priceToCoordinate(d.pts[1].p), yt=series.priceToCoordinate(d.pts[2].p); x0=Math.min(P[0].x,P[1].x); x1=Math.max(P[0].x,P[1].x,x0+30); y0=Math.min(ys,yt); y1=Math.max(ys,yt); }
  else if(d.type==='fib'){ const p1=d.pts[0].p,p2=d.pts[1].p; const ys=FIBS.map(L=>series.priceToCoordinate(p2+(p1-p2)*L)); x0=Math.min(P[0].x,P[1].x); x1=Math.max(P[0].x,P[1].x,x0+80); y0=Math.min(...ys); y1=Math.max(...ys); }
  else { x0=Math.min(P[0].x,P[1].x); x1=Math.max(P[0].x,P[1].x); y0=Math.min(P[0].y,P[1].y); y1=Math.max(P[0].y,P[1].y); }
  return x>=x0-tol && x<=x1+tol && y>=y0-tol && y<=y1+tol;
}

// ---------- interaction ----------
function lock(on){ chart.applyOptions({handleScroll:!on, handleScale:!on}); }
function syncLock(){ lock(mode!=='cursor' || sel!=null); }
function setMode(m){
  mode = m; pending = null; hover = null;
  if(m!=='cursor'){ sel = null; pending = {type:m, pts:[], color:S.color}; setStatus(m==='pos' ? 'Pozisyon: 1) girişe dokun  2) stop seviyesine dokun (sağa doğru → kutu genişliği). Hedef 2R.' : (m==='hline' ? 'Yatay çizgi: seviyeye dokun.' : '1. noktaya dokun (veya sürükleyerek çiz).')); }
  else showDataStatus();
  syncLock(); buildTools(); dirty = true;
}
function local(e){ const r = wrap.getBoundingClientRect(); return {x:e.clientX-r.left, y:e.clientY-r.top}; }
let down = null;
wrap.addEventListener('pointerdown', e => {
  const q = local(e); if(q.x > paneSize().w || q.y > paneSize().h) { down=null; return; }
  down = {x:q.x, y:q.y, id:e.pointerId};
  if(mode==='cursor' && sel){
    const d = drawings.find(z=>z.id===sel);
    const hs = d ? handlesOf(d) : [];
    const hi = hs.findIndex(h => h.x!=null && Math.hypot(h.x-q.x, h.y-q.y) < 22);
    if(hi >= 0) drag = {kind:'handle', d, idx:hi};
    else if(d && hit(d, q.x, q.y)) drag = {kind:'move', d, start:{l:ts.coordinateToLogical(q.x), p:series.coordinateToPrice(q.y)}, orig:JSON.parse(JSON.stringify(d.pts))};
    if(drag) e.stopPropagation();
  }
  if(mode!=='cursor'){ hover = fromXY(q.x, q.y, true); dirty = true; }
}, true);
wrap.addEventListener('pointermove', e => {
  const q = local(e);
  if(drag){
    const d = drag.d;
    if(drag.kind==='handle'){
      const np = fromXY(q.x, q.y, true); if(!np) return;
      if(d.type==='pos'){
        if(drag.idx===0){ d.pts[0] = np; }
        else { const i = drag.idx; d.pts[i].p = np.p; d.pts[1].t = d.pts[2].t = np.t; }
      } else d.pts[drag.idx] = np;
    } else {
      const l = ts.coordinateToLogical(q.x), p = series.coordinateToPrice(q.y); if(l==null||p==null) return;
      const dl = l-drag.start.l, dp = p-drag.start.p;
      d.pts = drag.orig.map(o => ({t: l2t(t2l(o.t)+dl), p: o.p+dp}));
    }
    dirty = true; return;
  }
  if(mode!=='cursor' && (e.pointerType==='mouse' || down)){ hover = fromXY(q.x, q.y, true); dirty = true; }
}, true);
function endPointer(e){
  const q = local(e);
  if(drag){ drag = null; saveDrawings(); dirty = true; down = null; return; }
  if(!down) return;
  const moved = Math.hypot(q.x-down.x, q.y-down.y) > 12;
  if(mode!=='cursor'){
    const pt = fromXY(q.x, q.y, true); if(!pt){ down=null; return; }
    if(pending.pts.length===0 && moved){ const p0 = fromXY(down.x, down.y, true); if(p0) pending.pts.push(p0); }
    pending.pts.push(pt);
    if(pending.pts.length >= NEED[pending.type]){
      const d = buildDrawing(pending.type, pending.pts, pending.color);
      drawings.push(d); saveDrawings(); mode='cursor'; pending=null; hover=null; sel=d.id; syncLock(); buildTools();
      setStatus('Seçili çizim: tutamaçları sürükle, gövdeden taşı. Grafiği kaydırmak için boş bir yere dokun.');
    } else if(pending.type==='pos') setStatus('Şimdi stop seviyesine dokun (sağa doğru → kutu genişliği).');
    else setStatus('2. noktaya dokun.');
    hover = null; dirty = true;
  } else if(!moved){
    let found = null; for(let i=drawings.length-1;i>=0;i--){ if(hit(drawings[i], q.x, q.y)){ found = drawings[i].id; break; } }
    const was = sel; sel = found; syncLock(); buildTools();
    if(sel) setStatus('Seçili çizim: tutamaçları sürükle, gövdeden taşı. Grafiği kaydırmak için boş bir yere dokun.');
    else showDataStatus();
    dirty = true;
  }
  down = null;
}
wrap.addEventListener('pointerup', endPointer, true);
wrap.addEventListener('pointercancel', () => { if(drag){ drag=null; saveDrawings(); } down=null; dirty=true; }, true);
wrap.addEventListener('pointerleave', e => { if(e.pointerType==='mouse' && !drag){ hover=null; dirty=true; } });
