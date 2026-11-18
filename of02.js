"use strict";
function computeVA(){
  if(!S.prof.size&&!S.profH.size)return null;
  let kMin=Infinity,kMax=-Infinity;
  for(const k of S.prof.keys()){if(k<kMin)kMin=k;if(k>kMax)kMax=k}
  for(const k of S.profH.keys()){if(k<kMin)kMin=k;if(k>kMax)kMax=k}
  const n=kMax-kMin+1;if(n>20000)return null;
  const v=new Float64Array(n);let tot=0,pi=0;
  for(const [k,e] of S.prof){const s=e.b+e.s;v[k-kMin]+=s;tot+=s}
  for(const [k,s] of S.profH){v[k-kMin]+=s;tot+=s}
  for(let i=1;i<n;i++)if(v[i]>v[pi])pi=i;
  let lo=pi,hi=pi,acc=v[pi];
  while(acc<tot*0.7&&(lo>0||hi<n-1)){const up=hi<n-1?v[hi+1]:-1,dn=lo>0?v[lo-1]:-1;if(up>=dn){hi++;acc+=v[hi]}else{lo--;acc+=v[lo]}}
  const t=S.tick;return {poc:(kMin+pi)*t,vah:(kMin+hi)*t,val:(kMin+lo)*t};
}
function capture(t){
  flushBig();
  if(!S.cur)return;
  S.va=computeVA();
  const W=S.vw;let vw=null;
  if(W.v>0){const m=W.pv/W.v;vw={m,sd:Math.sqrt(Math.max(0,W.p2/W.v-m*m))}}
  S.vwNow=vw;
  S.cols.push({t,base:S.curBase,d:S.cur,bb:S.bb,ba:S.ba,va:S.va,vw});
  if(S.firstT==null)S.firstT=t;
  while(S.cols.length>MAXCOL)S.cols.shift();
  S.colVer++;
  if(S.colVer%4===0)updateBigThr();
  detectBreakouts(t);
}
// gerçek geçmiş: Hyperliquid 1 dk mumları (alış/satış ayrımı ve defter yok; fiyat yolu + hacim + seviyeler)
function addHist(c){
  const t=S.tick;if(!t||!(c.v>=0))return;
  const k0=Math.round(c.l/t),k1=Math.round(c.h/t),n=Math.max(1,k1-k0+1),per=c.v/n;
  for(let k=k0;k<=k1;k++)S.profH.set(k,(S.profH.get(k)||0)+per);
  const tp=(c.h+c.l+c.c)/3;S.vw.pv+=tp*c.v;S.vw.v+=c.v;S.vw.p2+=tp*tp*c.v;
  S.va=computeVA();
  const W=S.vw,m=W.v>0?W.pv/W.v:c.c,vw=W.v>0?{m,sd:Math.sqrt(Math.max(0,W.p2/W.v-m*m))}:null;S.vwNow=vw;
  S.cols.push({t:c.T,hist:true,d:null,bb:null,ba:null,px:c.c,hi:c.h,lo:c.l,v:c.v,va:S.va,vw});
  if(S.firstT==null||c.t<S.firstT)S.firstT=c.t;
  S.last=c.c;S.prevPx=c.c;S.colVer++;
}
// kaydedilmiş olayları sırayla, yarım saniyelik yakalamalarla işler
function simulate(evs){
  let nc=null;
  for(const e of evs){if(nc==null)nc=e[1];while(nc<=e[1]){capture(nc);nc+=SAMPLE}applyEv(e)}
  if(nc!=null)capture(nc);
}
function onTrade(t,px,sz,buy){
  recPush(["T",t,px,+sz.toFixed(5),buy?1:0]);
  S.cvd+=buy?sz:-sz;
  S.trades.push({t,px,sz,buy,c:S.cvd});S.count++;S.last=px;S.lastBuy=buy;S.trVer++;
  S.vw.pv+=px*sz;S.vw.v+=sz;S.vw.p2+=px*px*sz;
  S.sizes.push(sz);if(S.sizes.length>4000)S.sizes.splice(0,1000);
  if(S.tick){const k=Math.round(px/S.tick);let e=S.prof.get(k);if(!e){e={b:0,s:0};S.prof.set(k,e)}if(buy)e.b+=sz;else e.s+=sz}
  if(S.trades.length%400===0){const lim=t-TRADE_KEEP;const n=lowerBound(S.trades,lim);if(n)S.trades.splice(0,n)}
  // aynı milisaniyede aynı yönlü dolumlar tek emir sayılır (büyük işlem alarmı için)
  const G=S.grp;
  if(G&&(G.t!==t||G.buy!==buy))flushBig();
  if(!S.grp)S.grp={t,buy,sz:0,pv:0};
  S.grp.sz+=sz;S.grp.pv+=px*sz;
  detectAbsorption(t,px,sz,buy);
}

/* ================= alarm motoru ================= */
function bigThr(){const m=+$("bigThr").value;return m>0?m:S.bigA}
function wallThr(){const m=+$("wallThr").value;if(m>0)return m;return S.thrInit?Math.max(S.hi*1.25,1e-9):Infinity}
function updateBigThr(){
  if(S.sizes.length<60){S.bigA=Infinity;return}
  const a=S.sizes.slice().sort((x,y)=>x-y);S.bigA=a[Math.floor(a.length*0.99)];
}
function throttled(key,t,ms){const l=S.throttle.get(key);if(l!=null&&t-l<ms)return true;S.throttle.set(key,t);return false}
function flushBig(){
  const G=S.grp;S.grp=null;if(!G)return;
  const thr=bigThr();
  if(G.sz>=thr&&$("aBig").checked)pushEvent({t:G.t,px:G.pv/G.sz,type:"big",dir:G.buy?1:-1,
    text:(G.buy?"Büyük ALIŞ ":"Büyük SATIŞ ")+fmt(G.sz),short:fmt(G.sz)});
}
function detectWalls(t){
  if(!$("aWall").checked&&!$("aBO").checked)return;
  const thr=wallThr();if(!isFinite(thr)||!S.fine)return;
  const fb=S.fine.b,fa=S.fine.a,lo=fb[fb.length-1].px,hi=fa[fa.length-1].px,mid=(S.bb+S.ba)/2,tick=S.tick;
  const seen=new Set();
  const visit=(l,side)=>{
    const key=side+l.px;let w=S.walls.get(key);
    if(l.sz>=thr){
      seen.add(key);
      if(!w){S.walls.set(key,{side,px:l.px,sz:l.sz,max:l.sz,t0:t,alerted:false,gone:null});return}
      w.sz=l.sz;w.max=Math.max(w.max,l.sz);w.gone=null;
      if(!w.alerted&&t-w.t0>=3000&&Math.abs(l.px-mid)<=15*tick){
        w.alerted=true;
        if($("aWall").checked)pushEvent({t,px:l.px,type:"wall",dir:side==="b"?1:-1,
          text:(side==="b"?"ALIŞ duvarı ":"SATIŞ duvarı ")+fmt(l.sz)+" @ "+l.px,short:fmt(l.sz)});
      }
    }else if(w&&l.sz>=w.max*0.3){seen.add(key);w.sz=l.sz}
  };
  for(const l of fb)visit(l,"b");for(const l of fa)visit(l,"a");
  for(const [key,w] of S.walls){
    if(seen.has(key))continue;
    if(w.px<lo||w.px>hi){S.walls.delete(key);continue}
    const broken=w.side==="b"?S.bb<w.px:S.ba>w.px;
    if(broken){
      if(w.alerted&&$("aBO").checked&&w.max>=thr*1.5&&!throttled("wbrk"+w.side,t,15000))pushEvent({t,px:w.px,type:"bo",dir:w.side==="b"?-1:1,
        text:(w.side==="b"?"▼ Alış duvarı kırıldı ":"▲ Satış duvarı kırıldı ")+fmt(w.max)+" @ "+w.px,short:"duvar"});
      S.walls.delete(key);continue;
    }
    const atTouch=w.side==="b"?S.bb===w.px:S.ba===w.px;
    if(w.gone==null)w.gone=t;
    if(atTouch){if(t-w.gone>8000)S.walls.delete(key);continue}
    let traded=0;for(let i=S.trades.length-1;i>=0&&S.trades[i].t>=t-5000;i--)if(Math.abs(S.trades[i].px-w.px)<tick/2)traded+=S.trades[i].sz;
    if(w.alerted&&traded<w.max*0.35&&$("aWall").checked)pushEvent({t,px:w.px,type:"pull",dir:w.side==="b"?1:-1,
      text:(w.side==="b"?"Alış duvarı çekildi ":"Satış duvarı çekildi ")+fmt(w.max)+" @ "+w.px,short:"çekildi"});
    S.walls.delete(key);
  }
}
