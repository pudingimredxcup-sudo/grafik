"use strict";
function drawPrep(R){
  let {dt}=R;
  const st=$("stage"),dpr=Math.min(2.5,window.devicePixelRatio||1);
  const W=st.clientWidth,H=st.clientHeight;
  if(cvEl.width!==Math.round(W*dpr)||cvEl.height!==Math.round(H*dpr)){cvEl.width=Math.round(W*dpr);cvEl.height=Math.round(H*dpr)}
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle=rgba(BG);ctx.fillRect(0,0,W,H);
  if(!S.cols.length||S.tick==null){
    ctx.fillStyle="#7d8898";ctx.font="13px system-ui";ctx.textAlign="left";
    ctx.fillText(S.mode?"Veri bekleniyor...":"Bağlan ya da Demo'ya bas.",14,26);return false;
  }
  const portrait=W<620,fpMode=$("view").value==="fp";
  const DW=Math.round(portrait?Math.max(66,W*0.2):Math.min(170,W*0.15)),AX=52,PW=W-DW-AX;
  const TA=16,VH=Math.round(H*(portrait?0.13:0.17)),CH=Math.round(H*(portrait?0.08:0.1)),HH=H-VH-CH-TA;
  $("zoom").style.bottom=(VH+CH+TA+8)+"px";
  const now=NOW(),win=+$("win").value*1000;
  const span=Math.min(win,Math.max(15000,now-S.firstT)),t0=now-span;
  const x=t=>PW-(now-t)/span*PW;
  const tick=S.tick,dec=decimals(tick);
  const lastPx=S.last!=null?S.last:(S.bb+S.ba)/2;

  // otomatik ölçek
  const c0=Math.max(0,lowerBound(S.cols,t0)-1),c1=S.cols.length;
  let pmin=Infinity,pmax=-Infinity;
  for(let c=c0;c<c1;c++){const k=S.cols[c];
    if(k.hist){if(k.t<t0)continue;if(k.lo<pmin)pmin=k.lo;if(k.hi>pmax)pmax=k.hi}
    else{if(k.bb<pmin)pmin=k.bb;if(k.ba>pmax)pmax=k.ba}}
  const ti0=lowerBound(S.trades,t0);
  for(let i=ti0;i<S.trades.length;i++){const p=S.trades[i].px;if(p<pmin)pmin=p;if(p>pmax)pmax=p}
  if(S.center==null){S.center=lastPx;S.target=lastPx}
  const ease=1-Math.pow(0.85,dt/16.7);
  if(S.autoZoom){
    const want=Math.max(22,((pmax-pmin)/2)/tick*1.3+8);
    S.half+=(Math.min(HALF-10,want)-S.half)*ease*0.6;S.target=(pmax+pmin)/2;
  }else if(S.autoCenter){if(Math.abs(lastPx-S.target)>S.half*tick*0.35)S.target=lastPx}
  if(S.autoCenter||S.autoZoom)S.center+=(S.target-S.center)*ease;
  const center=S.center,half=S.half,rowH=HH/(2*half);S.rowH=rowH;
  const y=p=>HH/2-(p-center)/tick*rowH;
  const vTop=center+half*tick,vBot=center-half*tick;
  Object.assign(R,{st,dpr,W,H,portrait,fpMode,DW,AX,PW,TA,VH,CH,HH,now,win,span,t0,x,tick,dec,lastPx,c0,c1,pmin,pmax,ti0,ease,center,half,rowH,y,vTop,vBot});return true;
}
function drawPart1(R){
  let {dt,st,dpr,W,H,portrait,fpMode,DW,AX,PW,TA,VH,CH,HH,now,win,span,t0,x,tick,dec,lastPx,c0,c1,pmin,pmax,ti0,ease,center,half,rowH,y,vTop,vBot}=R;
  ctx.save();ctx.beginPath();ctx.rect(0,0,PW,HH);ctx.clip();
  // ---- ısı haritası (footprint modunda arka plan sade) ----
  if(!fpMode){
    if(HM.dirty||HM.ver!==S.colVer||vTop>HM.top-tick||vBot<HM.top-(HM.n-2)*tick||half<HM.half*0.55||half>HM.half*1.5)buildHeat(t0,center,half,tick);
    if(HM.w>0){
      ctx.imageSmoothingEnabled=false;
      const yImg=y(HM.top)-rowH/2,hImg=HM.n*rowH,xA=x(HM.tA),xB=x(HM.tB);
      ctx.drawImage(HM.cv,0,0,HM.w,HM.n,xA,yImg,xB-xA,hImg);
      const lc=S.cols[S.cols.length-1];
      if(xB<PW&&lc&&lc.d)ctx.drawImage(HM.cv,HM.w-1,0,1,HM.n,xB,yImg,PW-xB,hImg);
      ctx.imageSmoothingEnabled=true;
    }
  }
  const lstep=niceStep(Math.max(tick,26/rowH*tick));
  ctx.fillStyle="rgba(255,255,255,.045)";
  for(let p=Math.ceil(vBot/lstep)*lstep;p<=vTop;p+=lstep)ctx.fillRect(0,Math.round(y(p)),PW,1);

  // hacim profili
  // hacim profili: canlı alış (yeşil) / satış (kırmızı) + geçmiş mum hacmi (gri, yön bilinmiyor)
  if(!fpMode&&$("prof").checked&&(S.prof.size||S.profH.size)){
    const pw=PW*0.18,kLo=Math.floor(vBot/tick)-1,kHi=Math.ceil(vTop/tick)+1;let pm=0;
    for(let k=kLo;k<=kHi;k++){const e=S.prof.get(k),hv=S.profH.get(k)||0,s=(e?e.b+e.s:0)+hv;if(s>pm)pm=s}
    if(pm>0){const h=Math.max(1,rowH-(rowH>3?1:0));
      for(let k=kLo;k<=kHi;k++){const e=S.prof.get(k),hv=S.profH.get(k)||0;if(!e&&!hv)continue;
        const yy=y(k*tick)-rowH/2,wb=e?e.b/pm*pw:0,ws=e?e.s/pm*pw:0,wh=hv/pm*pw;
        ctx.fillStyle="rgba(38,214,106,.55)";ctx.fillRect(PW-wb,yy,wb,h);
        ctx.fillStyle="rgba(255,66,88,.55)";ctx.fillRect(PW-wb-ws,yy,ws,h);
        ctx.fillStyle="rgba(170,180,200,.35)";ctx.fillRect(PW-wb-ws-wh,yy,wh,h);}}
  }
  Object.assign(R,{lstep});
}
