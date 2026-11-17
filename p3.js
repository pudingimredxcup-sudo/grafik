'use strict';
// ---------- coordinates ----------
function t2l(t){
  const n=bars.length; if(!n) return 0;
  if(t <= bars[0].time) return (t-bars[0].time)/tfSec;
  if(t >= bars[n-1].time) return n-1 + (t-bars[n-1].time)/tfSec;
  let lo=0, hi=n-1; while(hi-lo>1){ const mid=(lo+hi)>>1; if(bars[mid].time<=t) lo=mid; else hi=mid; }
  return lo + (t-bars[lo].time)/(bars[hi].time-bars[lo].time);
}
function l2t(l){
  const n=bars.length; if(!n) return 0;
  if(l <= 0) return bars[0].time + l*tfSec;
  if(l >= n-1) return bars[n-1].time + (l-(n-1))*tfSec;
  const i=Math.floor(l), f=l-i; return bars[i].time + f*(bars[i+1].time-bars[i].time);
}
const ts = chart.timeScale();
function toXY(pt){ return { x: ts.logicalToCoordinate(t2l(pt.t)), y: series.priceToCoordinate(pt.p) }; }
function fromXY(x, y, snap){
  const l = ts.coordinateToLogical(x); let p = series.coordinateToPrice(y);
  if(l==null || p==null) return null;
  let t = l2t(l);
  if(snap && S.magnet){
    const i = Math.round(l);
    if(i>=0 && i<bars.length){
      const b = bars[i]; let best=null, bd=16;
      for(const v of [b.open,b.high,b.low,b.close]){ const d=Math.abs(series.priceToCoordinate(v)-y); if(d<bd){bd=d; best=v;} }
      if(best!=null){ p=best; t=b.time; }
    }
  }
  return {t, p};
}
