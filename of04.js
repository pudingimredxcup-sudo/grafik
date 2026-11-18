"use strict";
function thresholds(c0,c1,center,half,tick){
  let vals=[];const all=[],step=Math.max(1,Math.floor((c1-c0)/80)),viewTop=center+half*tick,nr=Math.ceil(2*half);
  for(let c=c0;c<c1;c+=step){
    const col=S.cols[c];if(!col.d)continue;const o=Math.round((viewTop-col.base)/tick)+HALF;
    for(let r=0;r<=nr;r++){const i=o-r;if(i>=0&&i<NROW){const v=col.d[i];if(v>0)vals.push(v);else if(v<0)all.push(-v)}}
  }
  if(vals.length<10)vals=vals.concat(all);
  if(vals.length<10)return;
  vals.sort((a,b)=>a-b);
  const q=p=>vals[Math.min(vals.length-1,Math.max(0,Math.floor(p*vals.length)))];
  const lo=q(+$("lower").value/100),hi=Math.max(lo*1.05+1e-9,q(+$("upper").value/100));
  if(!S.thrInit){S.lo=lo;S.hi=hi;S.thrInit=true}else{S.lo+=(lo-S.lo)*0.3;S.hi+=(hi-S.hi)*0.3}
}
// zaman tabanlı: her görüntü sütunu kendi zamanındaki defter sütununu kullanır; boşluklar ve geçmiş mumlar arka plan rengi kalır
function buildHeat(t0,center,half,tick){
  let c0=Math.max(0,lowerBound(S.cols,t0)-1);const c1=S.cols.length;
  while(c0<c1&&!S.cols[c0].d)c0++;
  const margin=Math.ceil(half*0.6)+4,top=Math.round(center/tick+half+margin)*tick,n=Math.min(NROW,Math.ceil(2*(half+margin))+1);
  HM.top=top;HM.n=n;HM.half=half;HM.ver=S.colVer;HM.dirty=false;
  if(c0>=c1){HM.w=0;return}
  const tA=S.cols[c0].t,tB=S.cols[c1-1].t+SAMPLE,w=Math.max(1,Math.min(1000,Math.ceil((tB-tA)/SAMPLE))),dtc=(tB-tA)/w,gap=Math.max(SAMPLE*3,dtc*1.5);
  thresholds(c0,c1,center,half,tick);
  if(HM.cv.width!==w||HM.cv.height!==n){HM.cv.width=w;HM.cv.height=n;HM.img=HM.ctx.createImageData(w,n)}
  const D=HM.img.data,lo=Math.max(1e-9,S.lo),lr=Math.log(Math.max(S.hi/lo,1.0001));
  let j=c0;
  for(let xi=0;xi<w;xi++){
    const ti=tA+(xi+0.5)*dtc;while(j<c1-1&&S.cols[j+1].t<=ti)j++;
    const col=S.cols[j],d=(col.d&&ti-col.t<=gap)?col.d:null,o=d?Math.round((top-col.base)/tick)+HALF:0;
    for(let r=0;r<n;r++){
      const p=(r*w+xi)*4,i=o-r;let R=BG[0],G=BG[1],B=BG[2];
      if(d&&i>=0&&i<NROW){const v=d[i];
        if(v!==0){const a=v<0?-v:v;
          // alt kesimin (varsayılan: ortanca) altı koyu mavi tonlarda kalır; yalnızca ortalamanın belirgin üstü parlar
          let f=a<=lo?0.04+0.14*Math.sqrt(a/lo):0.18+0.82*Math.min(1,Math.log(a/lo)/lr);
          if(v<0)f=0.03+f*0.2;
          const k=Math.round(f*255)*3;R=LUT[k];G=LUT[k+1];B=LUT[k+2]}}
      D[p]=R;D[p+1]=G;D[p+2]=B;D[p+3]=255;
    }
  }
  HM.ctx.putImageData(HM.img,0,0);
  HM.w=w;HM.tA=tA;HM.tB=tB;
}

/* ================= baloncuk / hacim / footprint gruplama ================= */
const GR={ver:-1,slot:0,vslot:0,at:0,list:[],vb:new Map(),ref:null};
const SLOTS=[250,500,1000,2000,3000,5000,10000,15000,30000,60000,120000,300000];
function regroup(slot,vslot,tMin){
  const m=new Map(),vb=new Map(),tick=S.tick;
  for(let i=S.trades.length-1;i>=0;i--){
    const tr=S.trades[i];if(tr.t<tMin)break;
    const key=Math.floor(tr.t/slot)+"_"+Math.round(tr.px/tick);
    let g=m.get(key);if(!g){g={ts:0,px:tr.px,v:0,b:0};m.set(key,g)}
    g.ts+=tr.t*tr.sz;g.v+=tr.sz;if(tr.buy)g.b+=tr.sz;
    const vk=Math.floor(tr.t/vslot);let e=vb.get(vk);if(!e){e={b:0,s:0};vb.set(vk,e)}
    if(tr.buy)e.b+=tr.sz;else e.s+=tr.sz;
  }
  const list=[...m.values()].filter(g=>g.v>0);
  for(const g of list)g.t=g.ts/g.v;
  // referans: grupların %85'lik değeri → sıradan işlemler küçük, yalnızca öne çıkanlar büyük baloncuk
  if(list.length){const vs=list.map(g=>g.v).sort((a,b)=>a-b),r=vs[Math.floor(vs.length*0.85)]||vs[vs.length-1];GR.ref=GR.ref==null?r:GR.ref+(r-GR.ref)*0.2}
  list.sort((a,b)=>b.v-a.v);
  GR.list=list;GR.vb=vb;GR.slot=slot;GR.vslot=vslot;GR.ver=S.trVer;
}
const FP={ver:-1,tf:0,agg:0,at:0,bars:new Map()};
function buildFP(tf,agg,tMin){
  const bars=new Map(),tick=S.tick;
  for(let i=lowerBound(S.trades,tMin);i<S.trades.length;i++){
    const tr=S.trades[i],bt=Math.floor(tr.t/tf)*tf;
    let B=bars.get(bt);if(!B){B={lv:new Map(),d:0,v:0,mx:0,poc:null};bars.set(bt,B)}
    const kb=Math.floor(Math.round(tr.px/tick)/agg)*agg;
    let c=B.lv.get(kb);if(!c){c={b:0,s:0};B.lv.set(kb,c)}
    if(tr.buy){c.b+=tr.sz;B.d+=tr.sz}else{c.s+=tr.sz;B.d-=tr.sz}B.v+=tr.sz;
    const tv=c.b+c.s;if(tv>B.mx){B.mx=tv;B.poc=kb}
  }
  FP.bars=bars;FP.tf=tf;FP.agg=agg;FP.ver=S.trVer;
}

/* 3D baloncuk sprite önbelleği */
const SP=new Map();
function sprite(r,ri,style,dpr){
  const key=r+"|"+ri+"|"+style+"|"+dpr;let s=SP.get(key);if(s)return s;
  if(SP.size>900)SP.clear();
  const pad=2,cx=r+pad,size=Math.ceil((r+pad)*2*dpr);
  const c=document.createElement("canvas");c.width=c.height=size;
  const g=c.getContext("2d");g.scale(dpr,dpr);
  const f=ri/10,a0=-Math.PI/2;
  if(style==="pie"){
    if(f>0){g.beginPath();g.moveTo(cx,cx);g.arc(cx,cx,r,a0,a0+f*6.2832);g.closePath();g.fillStyle=rgba(BUY);g.fill()}
    if(f<1){g.beginPath();g.moveTo(cx,cx);g.arc(cx,cx,r,a0+f*6.2832,a0+6.2832);g.closePath();g.fillStyle=rgba(SELL);g.fill()}
  }else{
    const col=f>=0.5?mix(NEUT,BUY,Math.min(1,(f-0.5)*2.4)):mix(SELL,NEUT,Math.max(0,f*2.4-0.2));
    g.beginPath();g.arc(cx,cx,r,0,6.2832);g.fillStyle=rgba(col);g.fill();
  }
  const gr=g.createRadialGradient(cx-r*.36,cx-r*.42,r*.04,cx,cx,r);
  gr.addColorStop(0,"rgba(255,255,255,.8)");gr.addColorStop(.22,"rgba(255,255,255,.3)");
  gr.addColorStop(.55,"rgba(255,255,255,0)");gr.addColorStop(.86,"rgba(0,0,0,.25)");gr.addColorStop(1,"rgba(0,0,0,.6)");
  g.beginPath();g.arc(cx,cx,r,0,6.2832);g.fillStyle=gr;g.fill();
  g.lineWidth=1;g.strokeStyle="rgba(0,0,0,.65)";g.stroke();
  s={c,size:size/dpr,off:cx};SP.set(key,s);return s;
}
