"use strict";
setInterval(()=>{
  if(S.mode!=="live"||!S.ready||REC.ev.length<20)return;
  const cut=Date.now()-SAVE_MS;let i=0;while(i<REC.ev.length&&REC.ev[i][1]<cut)i++;
  idbPut("live:"+REC.coin,{coin:REC.coin,last:Date.now(),ev:REC.ev.slice(i)}).catch(()=>{});
},30000);

function resetView(){HM.dirty=true;GR.ver=-1;GR.ref=null;FP.ver=-1;$("evn").textContent="0"}
function openLive(reset){
  exitReplay(true);closeAll();if(demoT){clearInterval(demoT);demoT=null}
  const bn=srcFor()==="bn",coin=bn?"BINANCE:XAUUSDT@"+bnRow():$("coin").value.trim();
  if(reset){
    S=freshState();resetView();REC={coin,start:Date.now(),ev:[]};
    S.ready=false;liveQ=[];histCandles=null;restored=undefined;
    loadSaved(coin).then(r=>{restored=r||null;tryReady()});
    // geçmiş: önce websocket üzerinden, ayrıca HTTP ile de denenir; 7 sn içinde gelmezse geçmişsiz başlar
    if(bn)bnHist();else fetch(INFO_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(candleReq(coin))})
      .then(r=>r.json()).then(a=>{if(Array.isArray(a)&&histCandles==null){histCandles=a;tryReady()}}).catch(()=>{});
    clearTimeout(histTimer);histTimer=setTimeout(()=>{if(histCandles==null){histCandles=[];tryReady()}},7000);
  }
  S.mode="live";userStop=false;
  setStatus((S.ready?"Yeniden bağlanıyor: ":"Bağlanıyor, geçmiş yükleniyor: ")+srcLabel()+" ...","");
  if(bn){bnOpen();$("go").textContent="Durdur";return}
  wsF=openWs([{type:"l2Book",coin},{type:"trades",coin}],"fine",
    reset?[{method:"post",id:1,request:{type:"info",payload:candleReq(coin)}}]:[]);
  wsC=openWs([{type:"l2Book",coin,nSigFigs:4}],"coarse");
  pingT=setInterval(()=>{for(const w of [wsF,wsC])if(w&&w.readyState===1)w.send(JSON.stringify({method:"ping"}))},30000);
  $("go").textContent="Durdur";
}
function stopAll(){userStop=true;closeAll();if(demoT){clearInterval(demoT);demoT=null}S.mode=null;$("go").textContent="Bağlan";setStatus("Durduruldu.","")}
setInterval(()=>{if(S.mode==="live"&&S.ready)capture(Date.now())},SAMPLE);

/* ================= demo ================= */
let demoT=null,DM=null;
function randn(){return Math.sqrt(-2*Math.log(Math.random()+1e-12))*Math.cos(6.2832*Math.random())}
function dmSize(){return Math.random()<0.035?{s:30+Math.random()*110,wall:true}:{s:Math.exp(randn()*0.9+0.6),wall:false}}
function demoStep(t,dt){
  const M=DM;
  M.vel=M.vel*0.92+randn()*0.55;if(Math.random()<0.004)M.vel+=randn()*6;
  M.mid+=M.vel*dt*1.6;
  const bb=Math.floor(M.mid-0.5),ba=bb+1;
  for(let p=bb-230;p<=ba+230;p++){
    let L=M.book.get(p);if(!L){L=dmSize();M.book.set(p,L)}
    if(L.wall){if(Math.abs(p-M.mid)<4&&Math.random()<0.04){L.s*=0.15;L.wall=false}else L.s*=1+randn()*0.01}
    else{L.s=Math.max(0.05,L.s*(1+randn()*0.06));if(Math.random()<0.002){const n=dmSize();L.s=n.s;L.wall=n.wall}}
  }
  if(M.pbb!=null){const lo=Math.min(M.pbb,bb),hi=Math.max(M.pba,ba);for(let p=lo+1;p<hi;p++){const L=M.book.get(p);if(L&&L.wall){L.s=Math.random()*2;L.wall=false}}}
  M.pbb=bb;M.pba=ba;
  const rate=3+Math.abs(M.vel)*2.5,n=Math.floor(rate*dt+Math.random()),trades=[];
  for(let i=0;i<n;i++){
    const buy=Math.random()<0.5+Math.max(-0.35,Math.min(0.35,M.vel*0.12));
    let sz=Math.exp(randn()*1.0-0.9);if(Math.random()<0.03)sz=6+Math.random()*30;
    trades.push({time:Math.round(t-dt*1000+Math.random()*dt*1000),px:buy?ba:bb,sz,buy});
  }
  trades.sort((p,q)=>p.time-q.time);
  const P=v=>+(v*(M.sc||1)).toFixed(2);
  for(const tr of trades)onTrade(tr.time,P(tr.px),+tr.sz.toFixed(4),tr.buy);
  const fb=[],fa=[];
  for(let i=0;i<20;i++){fb.push({px:P(bb-i),sz:+M.book.get(bb-i).s.toFixed(4)});fa.push({px:P(ba+i),sz:+M.book.get(ba+i).s.toFixed(4)})}
  onFine(fb,fa,t);
  const cb=[],ca=[],b0=Math.floor(bb/10)*10,a0=Math.ceil(ba/10)*10;
  for(let i=0;i<20;i++){
    let sb=0,sa=0;const pb=b0-10*i,pa=a0+10*i;
    for(let k=0;k<10;k++){const lb=M.book.get(pb+k);if(lb&&pb+k<=bb)sb+=lb.s;const la=M.book.get(pa-k);if(la&&pa-k>=ba)sa+=la.s}
    cb.push({px:P(pb),sz:sb});ca.push({px:P(pa),sz:sa});
  }
  onCoarse(cb,ca,t);capture(t);
}
function startDemo(){
  exitReplay(true);userStop=true;closeAll();if(demoT)clearInterval(demoT);
  S=freshState();S.mode="demo";resetView();REC={coin:"DEMO",start:Date.now(),ev:[]};
  DM={mid:SYM[SYMB].demoMid,sc:SYM[SYMB].demoSc,vel:0,book:new Map(),pbb:null,pba:null};
  const now=Date.now();
  SILENT=true;
  // eşiklerin oluşması için ısı haritası eşiği önceden hesaplanır
  for(let t=now-185000;t<now;t+=SAMPLE){demoStep(t,SAMPLE/1000);if(!S.thrInit&&S.cols.length>5)thresholds(0,S.cols.length,S.bb,30,S.tick)}
  SILENT=false;
  demoT=setInterval(()=>demoStep(Date.now(),SAMPLE/1000),SAMPLE);
  setStatus("DEMO: sahte veri, canlı değil.","demo");$("go").textContent="Bağlan";
}

/* ================= tekrar oynatma ================= */
function applyEv(e){
  if(e[0]==="F")onFine(unflat(e[2]),unflat(e[3]),e[1]);
  else if(e[0]==="C")onCoarse(unflat(e[2]),unflat(e[3]),e[1]);
  else if(e[0]==="T")onTrade(e[1],e[2],e[3],e[4]===1);
}
function advanceTo(T){
  const ev=RP.ev;
  while(RP.i<ev.length&&ev[RP.i][1]<=T){
    const e=ev[RP.i];
    while(RP.nextCap<=e[1]){RP.clock=RP.nextCap;capture(RP.nextCap);RP.nextCap+=SAMPLE}
    RP.clock=e[1];applyEv(e);RP.i++;
  }
  while(RP.nextCap<=T){RP.clock=RP.nextCap;capture(RP.nextCap);RP.nextCap+=SAMPLE}
  RP.clock=T;
}
function replayReset(){S=freshState();S.mode="replay";resetView();RP.i=0;RP.nextCap=RP.t0;RP.clock=RP.t0}
