"use strict";
function drawPart4(R){
  let {dt,st,dpr,W,H,portrait,fpMode,DW,AX,PW,TA,VH,CH,HH,now,win,span,t0,x,tick,dec,lastPx,c0,c1,pmin,pmax,ti0,ease,center,half,rowH,y,vTop,vBot,lstep,lvCols,devPath,fillBand,showVA,showVW,showBand,fpTf}=R;
  {const hp=new Path2D();let st=false,lastX=0,lastY=0;
    for(let c=c0;c<c1;c++){const k=S.cols[c];if(!k.hist){if(st)break;continue}
      const X=x(k.t),Y=y(k.px);if(!st){hp.moveTo(x(k.t-60000),Y);st=true}hp.lineTo(X,Y);lastX=X;lastY=Y}
    if(st){ctx.setLineDash([]);ctx.strokeStyle="rgba(0,0,0,.6)";ctx.lineWidth=3.5;ctx.stroke(hp);
      ctx.strokeStyle="rgba(235,240,250,.85)";ctx.lineWidth=1.6;ctx.stroke(hp)}}
  // geçmişte ikinci bir mum bölümü (sayfa kapalıyken geçen süre) varsa onu da çiz
  {const hp=new Path2D();let st=false,seenLive=false;
    for(let c=c0;c<c1;c++){const k=S.cols[c];if(!k.hist){seenLive=true;continue}if(!seenLive)continue;
      const X=x(k.t),Y=y(k.px);if(!st){hp.moveTo(x(k.t-60000),Y);st=true}hp.lineTo(X,Y)}
    if(st){ctx.strokeStyle="rgba(0,0,0,.6)";ctx.lineWidth=3.5;ctx.stroke(hp);ctx.strokeStyle="rgba(235,240,250,.85)";ctx.lineWidth=1.6;ctx.stroke(hp)}}
  const stepLine=(get,cur,color)=>{
    ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash([2,3]);ctx.beginPath();let py=null,started=false;
    for(let c=c0;c<c1;c++){const k=S.cols[c],v=get(k);if(v==null){started=false;continue}
      const X=Math.max(-2,x(k.t)),Y=y(v);
      if(!started){ctx.moveTo(X,Y);started=true}else{ctx.lineTo(X,py);ctx.lineTo(X,Y)}py=Y}
    if(started&&cur!=null){ctx.lineTo(PW,py);ctx.lineTo(PW,y(cur))}ctx.stroke();ctx.setLineDash([]);
  };
  if(!fpMode&&rowH>=1.2&&S.bb!=null){stepLine(k=>k.bb,S.bb,"#3cf08a");stepLine(k=>k.ba,S.ba,"#ff5c70")}
  ctx.strokeStyle="rgba(255,255,255,.35)";ctx.lineWidth=1;ctx.beginPath();
  ctx.moveTo(0,Math.round(y(lastPx))+.5);ctx.lineTo(PW,Math.round(y(lastPx))+.5);ctx.stroke();
  Object.assign(R,{stepLine});
}
function drawPart5(R){
  let {dt,st,dpr,W,H,portrait,fpMode,DW,AX,PW,TA,VH,CH,HH,now,win,span,t0,x,tick,dec,lastPx,c0,c1,pmin,pmax,ti0,ease,center,half,rowH,y,vTop,vBot,lstep,lvCols,devPath,fillBand,showVA,showVW,showBand,fpTf,stepLine}=R;
  const slot=SLOTS.find(s=>s>=span/(PW/10))||300000,vslot=(+$("vbar").value*1000)||SLOTS.find(s=>s>=span/(PW/4))||300000;
  if((GR.ver!==S.trVer&&now-GR.at>80)||slot!==GR.slot||vslot!==GR.vslot){regroup(slot,vslot,now-win-60000);GR.at=now}
  if(!fpMode){
    const minb=+$("minb").value||0,bs=+$("bsize").value,style=$("bstyle").value;
    const rMax=Math.max(12,Math.min(30,PW/11))*bs,ref=GR.ref||1,labels=[];
    for(const g of GR.list){
      if(g.t<t0-slot||g.v<minb)continue;
      const X=x(g.t),Y=y(g.px);if(Y<-30||Y>HH+30)continue;
      const r=Math.round(Math.min(rMax,Math.max(2,4.5*bs*Math.sqrt(g.v/ref)))*2)/2;
      const s=sprite(r,Math.round(g.b/g.v*10),style,dpr);
      ctx.drawImage(s.c,X-s.off,Y-s.off,s.size,s.size);
      if(r>=12)labels.push([X,Y,g.v]);
    }
    ctx.font="bold 10px system-ui";ctx.textAlign="center";ctx.fillStyle="#fff";ctx.shadowColor="rgba(0,0,0,.95)";ctx.shadowBlur=3;
    for(const [X,Y,v] of labels)ctx.fillText(fmt(v),X,Y+3.5);
    ctx.shadowBlur=0;
  }
  Object.assign(R,{slot,vslot});
}
function drawPart6(R){
  let {dt,st,dpr,W,H,portrait,fpMode,DW,AX,PW,TA,VH,CH,HH,now,win,span,t0,x,tick,dec,lastPx,c0,c1,pmin,pmax,ti0,ease,center,half,rowH,y,vTop,vBot,lstep,lvCols,devPath,fillBand,showVA,showVW,showBand,fpTf,stepLine,slot,vslot}=R;
  if($("showEv").checked){
    // sade işaretler: kırılımlar her zaman etiketli, diğerleri simge; yalnızca son 3 olay yazılı
    const vis=S.events.filter(e=>e.t>=t0&&e.t<=now);
    const recent=new Set(vis.slice(-3)),recentBO=new Set(vis.filter(e=>e.type==="bo").slice(-4));
    ctx.textAlign="center";
    for(const e of vis){
      const X=x(e.t),Y=y(e.px);if(Y<-10||Y>HH+10)continue;const col=evColor(e);
      if(e.type==="bo"){
        const s=9,d=e.dir;ctx.beginPath();
        ctx.moveTo(X,Y-d*(s+4));ctx.lineTo(X-s,Y-d*(s+4)+d*s*1.5);ctx.lineTo(X+s,Y-d*(s+4)+d*s*1.5);ctx.closePath();
        ctx.fillStyle=col;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle="rgba(0,0,0,.8)";ctx.stroke();
        if(recentBO.has(e))chip(X+10,Y-d*14,(d>0?"▲ ":"▼ ")+e.short,col);
      }else if(e.type==="big"){
        ctx.beginPath();ctx.arc(X,Y,7,0,6.2832);ctx.lineWidth=2.5;ctx.strokeStyle="rgba(0,0,0,.8)";ctx.stroke();
        ctx.lineWidth=1.6;ctx.strokeStyle="#fff";ctx.stroke();
        if(recent.has(e))chip(X+9,Y-12,"⚡ "+e.short,col);
      }else{
        const icon={wall:"▮",pull:"✕",abs:"◆"}[e.type]||"•";
        ctx.font="bold 11px system-ui";ctx.textAlign="center";ctx.lineWidth=3;ctx.strokeStyle="rgba(0,0,0,.9)";
        ctx.strokeText(icon,X,Y+4);ctx.fillStyle=col;ctx.fillText(icon,X,Y+4);
        if(recent.has(e))chip(X+8,Y-12,icon+" "+e.short,col);
      }
    }
  }
  
}
