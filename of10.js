"use strict";
function drawPart10(R){
  let {dt,st,dpr,W,H,portrait,fpMode,DW,AX,PW,TA,VH,CH,HH,now,win,span,t0,x,tick,dec,lastPx,c0,c1,pmin,pmax,ti0,ease,center,half,rowH,y,vTop,vBot,lstep,lvCols,devPath,fillBand,showVA,showVW,showBand,fpTf,stepLine,slot,vslot,gx,gy,gw,tg,tags,dx}=R;
  const vy=HH,vbBase=vy+VH-3,vhMax=VH-16;
  ctx.fillStyle="#080d17";ctx.fillRect(0,vy,W,VH+CH+TA);
  ctx.fillStyle="#1d2636";ctx.fillRect(0,vy,W,1);ctx.fillRect(0,vy+VH,W,1);
  const k0=Math.floor(t0/vslot),k1=Math.floor(now/vslot);let vmax=0,vb=0,vs=0;const vals=[];
  for(let k=k0;k<=k1;k++){const e=GR.vb.get(k);if(e){vmax=Math.max(vmax,e.b+e.s);vb+=e.b;vs+=e.s;vals.push(e.b+e.s)}}
  // geçmiş mum hacmi, çubuk süresine göre ölçeklenir (yön bilinmediği için gri)
  const hb=[];for(let c=c0;c<c1;c++){const k=S.cols[c];if(!k.hist||k.t<t0)continue;const hv=k.v*(vslot/60000);hb.push([k,hv]);vals.push(hv);vmax=Math.max(vmax,hv)}
  if(vmax>0){
    vals.sort((a,b)=>a-b);
    const p90=vals[Math.floor(vals.length*0.9)]||vmax,top=niceStep(Math.min(vmax,Math.max(p90*1.6,vmax*0.25))),sc=vhMax/top,clipTop=vbBase-vhMax;
    ctx.fillStyle="rgba(255,255,255,.07)";ctx.fillRect(0,Math.round(vbBase-top*sc),PW,1);ctx.fillRect(0,Math.round(vbBase-top*sc/2),PW,1);
    for(const [k,hv] of hb){const xa=Math.max(0,x(k.t-60000)),xb=Math.min(PW,x(k.t)),w=Math.max(1.5,xb-xa-1);if(xb<0)continue;
      const h=Math.min(vhMax,hv*sc);ctx.fillStyle="rgba(150,162,185,.6)";ctx.fillRect(xa,vbBase-h,w,h)}
    for(let k=k0;k<=k1;k++){const e=GR.vb.get(k);if(!e)continue;
      const xa=x(k*vslot),xb=Math.min(PW,x((k+1)*vslot)),w=Math.max(1.5,xb-xa-1);if(xb<0)continue;
      let hb=e.b*sc,hs=e.s*sc;const over=hb+hs>vhMax;if(over){const f=vhMax/(hb+hs);hb*=f;hs*=f}
      ctx.fillStyle="#26d66a";ctx.fillRect(xa,vbBase-hb,w,hb);ctx.fillStyle="#ff4258";ctx.fillRect(xa,vbBase-hb-hs,w,hs);
      if(over){ctx.fillStyle="#ffd646";ctx.fillRect(xa,clipTop-2,w,2);if(w>=14){ctx.font="9px system-ui";ctx.textAlign="center";ctx.fillText(fmt(e.b+e.s),xa+w/2,clipTop-4)}}}
    ctx.fillStyle="#9aa6b5";ctx.font="10px system-ui";ctx.textAlign="left";
    ctx.fillText(fmt(top),PW+4,vbBase-top*sc+4);ctx.fillText(fmt(top/2),PW+4,vbBase-top*sc/2+4);
    const e=GR.vb.get(k1),tot=vb+vs,bp=tot?vb/tot*100:0,s1="Al "+fmt(vb)+" ("+bp.toFixed(0)+"%)";
    ctx.fillStyle="#dfe6f0";ctx.font="bold 10px system-ui";ctx.fillText("HACİM",4,vy+12);
    ctx.font="10px system-ui";ctx.fillStyle="#26d66a";ctx.fillText(s1,48,vy+12);
    ctx.fillStyle="#ff4258";ctx.fillText("Sat "+fmt(vs),48+ctx.measureText(s1).width+10,vy+12);
    if(e){ctx.fillStyle="#9aa6b5";ctx.textAlign="right";ctx.fillText("son "+fmt(e.b+e.s),PW-4,vy+12)}
  }
  Object.assign(R,{vy,vbBase,vhMax,k0,k1,vmax,vb,vs,vals,hb});
}
function drawPart11(R){
  let {dt,st,dpr,W,H,portrait,fpMode,DW,AX,PW,TA,VH,CH,HH,now,win,span,t0,x,tick,dec,lastPx,c0,c1,pmin,pmax,ti0,ease,center,half,rowH,y,vTop,vBot,lstep,lvCols,devPath,fillBand,showVA,showVW,showBand,fpTf,stepLine,slot,vslot,gx,gy,gw,tg,tags,dx,vy,vbBase,vhMax,k0,k1,vmax,vb,vs,vals,hb}=R;
  const cy0=vy+VH,ti1=S.trades.length;
  if(ti1-ti0>1){
    const base=ti0>0?S.trades[ti0-1].c:0;let mn=0,mxv=0;
    for(let i=ti0;i<ti1;i++){const v=S.trades[i].c-base;if(v<mn)mn=v;if(v>mxv)mxv=v}
    const rg=(mxv-mn)||1,cy=v=>cy0+5+(mxv-v)/rg*(CH-10),zy=cy(0);
    const path=new Path2D();path.moveTo(Math.max(0,x(S.trades[ti0].t)),zy);let lx=-1;
    for(let i=ti0;i<ti1;i++){const X=x(S.trades[i].t);if(X-lx<1&&i<ti1-1)continue;lx=X;path.lineTo(X,cy(S.trades[i].c-base))}
    const lastC=S.trades[ti1-1].c-base;path.lineTo(PW,cy(lastC));
    const area=new Path2D(path);area.lineTo(PW,zy);area.closePath();
    ctx.save();ctx.beginPath();ctx.rect(0,cy0,PW,zy-cy0);ctx.clip();ctx.fillStyle="rgba(38,214,106,.28)";ctx.fill(area);ctx.restore();
    ctx.save();ctx.beginPath();ctx.rect(0,zy,PW,cy0+CH-zy);ctx.clip();ctx.fillStyle="rgba(255,66,88,.28)";ctx.fill(area);ctx.restore();
    ctx.fillStyle="rgba(255,255,255,.12)";ctx.fillRect(0,Math.round(zy),PW,1);
    ctx.strokeStyle="#ffd646";ctx.lineWidth=1.5;ctx.stroke(path);
    ctx.fillStyle="#dfe6f0";ctx.font="bold 10px system-ui";ctx.textAlign="left";ctx.fillText("CVD",4,cy0+12);
    ctx.fillStyle=lastC>=0?"#26d66a":"#ff4258";ctx.fillText((lastC>=0?"+":"-")+fmt(lastC),PW+4,Math.min(cy0+CH-3,Math.max(cy0+11,cy(lastC)+4)));
  }
  Object.assign(R,{cy0,ti1});
}
function drawPart12(R){
  let {dt,st,dpr,W,H,portrait,fpMode,DW,AX,PW,TA,VH,CH,HH,now,win,span,t0,x,tick,dec,lastPx,c0,c1,pmin,pmax,ti0,ease,center,half,rowH,y,vTop,vBot,lstep,lvCols,devPath,fillBand,showVA,showVW,showBand,fpTf,stepLine,slot,vslot,gx,gy,gw,tg,tags,dx,vy,vbBase,vhMax,k0,k1,vmax,vb,vs,vals,hb,cy0,ti1}=R;
  const tstep=[1,2,5,10,15,30,60,120,300,600].map(s=>s*1000).find(s=>s/span*PW>=72)||1800000;
  ctx.font="10px system-ui";ctx.textAlign="center";
  for(let tt=Math.ceil(t0/tstep)*tstep;tt<=now;tt+=tstep){
    const X=x(tt);if(X<22||X>PW-22)continue;
    ctx.fillStyle="rgba(255,255,255,.04)";ctx.fillRect(Math.round(X),0,1,H-TA);
    ctx.fillStyle="#7d8898";ctx.fillText(hhmmss(tt),X,H-4);
  }
  if(RP.on&&!RP.drag){$("rseek").value=Math.round((RP.clock-RP.t0)/Math.max(1,RP.t1-RP.t0)*1000);$("rtime").textContent=hhmmss(RP.clock)}
  Object.assign(R,{tstep});
}
function draw(dt){
  const R={dt};
  if(!drawPrep(R))return;
  drawPart1(R);
  drawPart2(R);
  drawPart3(R);
  drawPart4(R);
  drawPart5(R);
  drawPart6(R);
  drawPart7(R);
  drawPart8(R);
  drawPart9(R);
  drawPart10(R);
  drawPart11(R);
  drawPart12(R);
}
