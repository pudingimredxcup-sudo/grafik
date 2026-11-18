"use strict";
function drawPart7(R){
  let {dt,st,dpr,W,H,portrait,fpMode,DW,AX,PW,TA,VH,CH,HH,now,win,span,t0,x,tick,dec,lastPx,c0,c1,pmin,pmax,ti0,ease,center,half,rowH,y,vTop,vBot,lstep,lvCols,devPath,fillBand,showVA,showVW,showBand,fpTf,stepLine,slot,vslot}=R;
  const gx=8,gy=8,gw=88;
  if(!fpMode){
    ctx.fillStyle="rgba(6,10,20,.75)";ctx.fillRect(gx-4,gy-4,gw+8,27);
    const gr=ctx.createLinearGradient(gx,0,gx+gw,0);PALCSS.forEach(s=>gr.addColorStop(s[0],s[1]));
    ctx.fillStyle=gr;ctx.fillRect(gx,gy,gw,6);
    ctx.font="10px system-ui";ctx.fillStyle="#9aa6b5";ctx.textAlign="left";ctx.fillText(fmt(S.lo),gx,gy+18);
    ctx.textAlign="right";ctx.fillText(fmt(S.hi)+"+",gx+gw,gy+18);
  }
  ctx.textAlign="left";ctx.font="10px system-ui";ctx.fillStyle="#6b7686";
  ctx.fillText(Math.round(fpsE)+" fps"+(fpMode?" · footprint "+(fpTf>=60000?fpTf/60000+" dk":fpTf/1000+" sn"):""),gx,fpMode?14:gy+34);
  ctx.restore();
  Object.assign(R,{gx,gy,gw});
}
function drawPart8(R){
  let {dt,st,dpr,W,H,portrait,fpMode,DW,AX,PW,TA,VH,CH,HH,now,win,span,t0,x,tick,dec,lastPx,c0,c1,pmin,pmax,ti0,ease,center,half,rowH,y,vTop,vBot,lstep,lvCols,devPath,fillBand,showVA,showVW,showBand,fpTf,stepLine,slot,vslot,gx,gy,gw}=R;
  ctx.fillStyle="#0a0f1a";ctx.fillRect(PW,0,AX,HH);
  ctx.fillStyle="#9aa6b5";ctx.font="11px system-ui";ctx.textAlign="left";
  const tg=[];
  if(showVA&&S.va)tg.push(["VAH",S.va.vah,VA_C,"#120a2a"],["VAL",S.va.val,VA_C,"#120a2a"],["POC",S.va.poc,POC_C,"#fff"]);
  if(showVW&&S.vwNow)tg.push(["VWAP",S.vwNow.m,VW_C,"#000"]);
  const tags=tg.map(([name,p,bg,fg])=>({name,p,bg,fg,Y:y(p)})).filter(t=>t.Y>-8&&t.Y<HH+8);
  tags.push({name:null,p:lastPx,bg:S.lastBuy?"#1fb85a":"#e23a50",fg:"#fff",Y:y(lastPx)});
  tags.sort((a,b)=>a.Y-b.Y);
  for(const t of tags)t.Yc=Math.min(HH-9,Math.max(9,t.Y));
  for(let i=1;i<tags.length;i++)if(tags[i].Yc<tags[i-1].Yc+18)tags[i].Yc=tags[i-1].Yc+18;
  for(let i=tags.length-1;i>=0;i--){const lim=i===tags.length-1?HH-9:tags[i+1].Yc-18;if(tags[i].Yc>lim)tags[i].Yc=lim}
  for(let p=Math.ceil(vBot/lstep)*lstep;p<=vTop;p+=lstep){const Y=y(p);if(Y>8&&Y<HH-4&&tags.every(t=>Math.abs(Y-t.Yc)>13))ctx.fillText(p.toFixed(dec),PW+4,Y+4)}
  for(const t of tags){
    ctx.fillStyle=t.bg;ctx.fillRect(PW,t.Yc-9,AX,18);
    ctx.fillStyle=t.fg;ctx.font="bold 11px system-ui";ctx.textAlign="left";ctx.fillText(t.p.toFixed(dec),PW+4,t.Yc+4);
    if(t.name){ctx.fillStyle=t.bg;ctx.textAlign="right";ctx.shadowColor="rgba(0,0,0,.95)";ctx.shadowBlur=3;
      ctx.font="bold 10px system-ui";ctx.fillText(t.name,PW-4,t.Yc+4);ctx.shadowBlur=0}
  }
  Object.assign(R,{tg,tags});
}
function drawPart9(R){
  let {dt,st,dpr,W,H,portrait,fpMode,DW,AX,PW,TA,VH,CH,HH,now,win,span,t0,x,tick,dec,lastPx,c0,c1,pmin,pmax,ti0,ease,center,half,rowH,y,vTop,vBot,lstep,lvCols,devPath,fillBand,showVA,showVW,showBand,fpTf,stepLine,slot,vslot,gx,gy,gw,tg,tags}=R;
  const dx=PW+AX;
  ctx.fillStyle="#0b111c";ctx.fillRect(dx,0,DW,HH);
  if(S.cur){
    const nR=Math.ceil(2*half)+3,top=Math.round(vTop/tick+1)*tick,o=Math.round((top-S.curBase)/tick)+HALF;let mx=0;
    for(let r=0;r<nR;r++){const i=o-r;if(i>=0&&i<NROW)mx=Math.max(mx,Math.abs(S.cur[i]))}
    ctx.font=(rowH>=13?"11px":"10px")+" system-ui";ctx.textAlign="left";
    const h=Math.max(1,rowH-(rowH>3?1:0)),wt=wallThr();
    for(let r=0;r<nR;r++){
      const i=o-r;if(i<0||i>=NROW)continue;const v=S.cur[i];if(v===0)continue;
      const a=Math.abs(v),fine=v>0,p=top-r*tick,yy=y(p)-rowH/2,bid=p<=S.bb;
      ctx.fillStyle=bid?(fine?"rgba(38,214,106,.8)":"rgba(38,214,106,.28)"):(fine?"rgba(255,66,88,.8)":"rgba(255,66,88,.28)");
      ctx.fillRect(dx,yy,Math.max(1,a/mx*(DW-4)),h);
      if(fine&&a>=wt){ctx.strokeStyle="#fff";ctx.lineWidth=1;ctx.strokeRect(dx+.5,yy+.5,Math.max(2,a/mx*(DW-4))-1,Math.max(1,h-1))}
      if(fine&&rowH>=10){ctx.fillStyle="#fff";ctx.fillText(fmt(a),dx+3,yy+h/2+4)}
    }
  }
  ctx.fillStyle="#7d8898";ctx.font="10px system-ui";ctx.textAlign="right";ctx.fillText("defter",W-4,HH-4);
  Object.assign(R,{dx});
}
