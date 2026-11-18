"use strict";
function drawPart2(R){
  let {dt,st,dpr,W,H,portrait,fpMode,DW,AX,PW,TA,VH,CH,HH,now,win,span,t0,x,tick,dec,lastPx,c0,c1,pmin,pmax,ti0,ease,center,half,rowH,y,vTop,vBot,lstep}=R;
  const lvCols=[];for(let c=c0;c<c1;c++)lvCols.push(S.cols[c]);
  const devPath=get=>{const p=new Path2D();let py=null,started=false;
    for(const k of lvCols){const v=get(k);if(v==null){started=false;continue}
      const X=Math.max(-2,x(k.t)),Y=y(v);if(!started){p.moveTo(X,Y);started=true}else{p.lineTo(X,py);p.lineTo(X,Y)}py=Y}
    if(started)p.lineTo(PW,py);return p};
  const fillBand=(gt,gb,style)=>{ctx.fillStyle=style;
    for(let i=0;i<lvCols.length;i++){const k=lvCols[i],a=gt(k),b=gb(k);if(a==null)continue;
      const xa=Math.max(0,x(k.t)),xb=i+1<lvCols.length?x(lvCols[i+1].t):PW;if(xb<0)continue;
      ctx.fillRect(xa,y(a),xb-xa,y(b)-y(a))}};
  const showVA=$("showVA").checked,showVW=$("showVW").checked,showBand=$("showBand").checked&&showVW;
  if(showVA)fillBand(k=>k.va&&k.va.vah+tick/2,k=>k.va&&k.va.val-tick/2,VA_FILL);
  if(showBand){
    const thin=(p,c,w,d)=>{ctx.setLineDash(d);ctx.strokeStyle=c;ctx.lineWidth=w;ctx.stroke(p);ctx.setLineDash([])};
    thin(devPath(k=>k.vw&&k.vw.m+2*k.vw.sd),"rgba(255,255,255,.38)",1,[2,4]);
    thin(devPath(k=>k.vw&&k.vw.m-2*k.vw.sd),"rgba(255,255,255,.38)",1,[2,4]);
    thin(devPath(k=>k.vw&&k.vw.m+k.vw.sd),"rgba(255,255,255,.6)",1.2,[6,4]);
    thin(devPath(k=>k.vw&&k.vw.m-k.vw.sd),"rgba(255,255,255,.6)",1.2,[6,4]);
  }
  if(showVA){
    halo(devPath(k=>k.va&&k.va.vah),VA_C,2);halo(devPath(k=>k.va&&k.va.val),VA_C,2);
    halo(devPath(k=>k.va&&k.va.poc),POC_C,3);
    if(!fpMode&&$("prof").checked&&S.va){const py=y(S.va.poc);ctx.strokeStyle=POC_C;ctx.lineWidth=1.5;ctx.strokeRect(PW-PW*0.18-1,py-rowH/2,PW*0.18+1,Math.max(2,rowH))}
  }
  if(showVW)halo(devPath(k=>k.vw&&k.vw.m),VW_C,2.2);
  if($("showCh").checked)drawChartDrawings(x,y,t0,now,PW,HH);
  Object.assign(R,{lvCols,devPath,fillBand,showVA,showVW,showBand});
}
function drawPart3(R){
  let {dt,st,dpr,W,H,portrait,fpMode,DW,AX,PW,TA,VH,CH,HH,now,win,span,t0,x,tick,dec,lastPx,c0,c1,pmin,pmax,ti0,ease,center,half,rowH,y,vTop,vBot,lstep,lvCols,devPath,fillBand,showVA,showVW,showBand}=R;
  let fpTf=0;
  if(fpMode){
    fpTf=+$("fptf").value*1000||[1,2,5,10,15,30,60,120,300,600].map(s=>s*1000).find(s=>s/span*PW>=(portrait?78:92))||600000;
    let agg=1;for(const a of [1,2,5,10,20,25,50,100])if(a*rowH>=13){agg=a;break}else agg=a;
    if(FP.ver!==S.trVer&&now-FP.at>150||FP.tf!==fpTf||FP.agg!==agg){buildFP(fpTf,agg,t0-fpTf);FP.at=now}
    const ratio=3,cellH=agg*rowH;
    for(const [bt,B] of FP.bars){
      const xa=x(bt),xb=Math.min(PW,x(bt+fpTf));if(xb<0||xa>PW)continue;
      const bw=xb-xa;let vmx=0;for(const c of B.lv.values())vmx=Math.max(vmx,c.b+c.s);
      ctx.fillStyle="rgba(255,255,255,.07)";ctx.fillRect(Math.round(xa),0,1,HH);
      const txt=bw>=56&&cellH>=11;ctx.font=(cellH>=14?"11px":"10px")+" system-ui";ctx.textAlign="center";
      for(const [kb,c] of B.lv){
        const pTop=(kb+agg-1)*tick,yy=y(pTop)-rowH/2;if(yy>HH||yy+cellH<0)continue;
        const tv=c.b+c.s,f=tv/vmx;
        const dl=c.b-c.s;ctx.fillStyle=dl>=0?`rgba(38,214,106,${0.1+0.4*f})`:`rgba(255,66,88,${0.1+0.4*f})`;
        ctx.fillRect(xa+1,yy+0.5,bw-2,cellH-1);
        if(B.poc===kb){ctx.strokeStyle=POC_C;ctx.lineWidth=1.5;ctx.strokeRect(xa+1.5,yy+1,bw-3,cellH-2)}
        if(txt){
          const below=B.lv.get(kb-agg),above=B.lv.get(kb+agg);
          const bImb=below&&below.s>0&&c.b>=ratio*below.s,sImb=above&&above.b>0&&c.s>=ratio*above.b;
          const ty=yy+cellH/2+3.5;
          ctx.fillStyle=sImb?"#ff7b8c":"#e6ebf2";ctx.font=(sImb?"bold ":"")+(cellH>=14?"11px":"10px")+" system-ui";ctx.textAlign="right";ctx.fillText(fmt(c.s),xa+bw/2-4,ty);
          ctx.fillStyle="#7d8898";ctx.textAlign="center";ctx.fillText("×",xa+bw/2,ty);
          ctx.fillStyle=bImb?"#5cf59b":"#e6ebf2";ctx.font=(bImb?"bold ":"")+(cellH>=14?"11px":"10px")+" system-ui";ctx.textAlign="left";ctx.fillText(fmt(c.b),xa+bw/2+4,ty);
        }
      }
      // çubuk altı: delta ve hacim
      ctx.fillStyle="rgba(8,12,24,.88)";ctx.fillRect(xa+1,HH-30,bw-2,30);
      ctx.font="bold 10px system-ui";ctx.textAlign="center";
      ctx.fillStyle=B.d>=0?"#3cf08a":"#ff5c70";ctx.fillText("Δ "+(B.d>=0?"+":"-")+fmt(B.d),xa+bw/2,HH-17);
      ctx.fillStyle="#9aa6b5";ctx.font="10px system-ui";ctx.fillText("V "+fmt(B.v),xa+bw/2,HH-5);
    }
  }
  Object.assign(R,{fpTf});
}
