"use strict";
/* ================= grafik sitesiyle ortak çizimler =================
   Aynı sitedeki grafik sayfası çizimleri bu telefonda 'gx_draw_<SEMBOL>' anahtarında saklar.
   Fiyatlara grafikteki "fiyat farkı" eklenmiştir; burada Hyperliquid fiyatına geri çevrilir. */
const CH={draws:[],off:0,tz:"UTC"};
const CH_FIBS=[-0.62,-0.27,0,0.236,0.382,0.5,0.618,0.705,0.786,1];
function loadChartDrawings(){
  try{
    const ds=JSON.parse(localStorage.getItem("gx_draw_"+SYMB)||"[]"),st=JSON.parse(localStorage.getItem("gx_settings")||"{}");
    CH.draws=Array.isArray(ds)?ds.filter(d=>d&&Array.isArray(d.pts)&&d.pts.length):[];
    CH.off=(st.off&&+st.off[SYMB])||0;CH.tz=st.tz||"UTC";
  }catch(e){CH.draws=[]}
}
loadChartDrawings();
window.addEventListener("storage",e=>{if(!e.key||e.key.startsWith("gx_"))loadChartDrawings()});
setInterval(loadChartDrawings,3000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)loadChartDrawings()});
function hexA(h,a){h=String(h||"#f5c542").replace("#","");if(h.length===3)h=h.split("").map(c=>c+c).join("");const n=parseInt(h.slice(0,6),16)||0;return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`}
const chMs=t=>(CH.tz==="local"?t+new Date(t*1000).getTimezoneOffset()*60:t)*1000;
function drawChartDrawings(x,y,t0,now,PW,HH){
  if(!CH.draws.length)return;
  const P=p=>p-CH.off,lab=(txt,yy,c)=>{if(yy<-6||yy>HH+6)return;ctx.font="bold 10px system-ui";ctx.textAlign="right";
    ctx.lineWidth=3;ctx.strokeStyle="rgba(0,0,0,.85)";ctx.strokeText(txt,PW-62,yy-3);ctx.fillStyle=c;ctx.fillText(txt,PW-62,yy-3)};
  const hl=(p,c,w,dash,txt)=>{const yy=y(P(p));if(yy<-4||yy>HH+4)return;ctx.setLineDash(dash||[]);ctx.strokeStyle=c;ctx.lineWidth=w;
    ctx.beginPath();ctx.moveTo(0,Math.round(yy)+.5);ctx.lineTo(PW,Math.round(yy)+.5);ctx.stroke();ctx.setLineDash([]);if(txt)lab(txt,yy,c)};
  for(const d of CH.draws){
    const c=d.color||"#f5c542",a=d.pts[0],b=d.pts[1];
    if(d.type==="hline")hl(a.p,c,1.6,[],"Yatay "+a.p);
    else if(d.type==="rect"&&b){
      const ya=y(P(a.p)),yb=y(P(b.p)),top=Math.min(ya,yb),h=Math.abs(yb-ya),xa=x(chMs(Math.min(a.t,b.t))),xb=x(chMs(Math.max(a.t,b.t)));
      // kutunun kendi zamanı + sağa doğru uzantısı (bölge haritada da görünsün)
      if(xb>0){ctx.fillStyle=hexA(c,.16);ctx.fillRect(Math.max(0,xa),top,Math.min(PW,xb)-Math.max(0,xa),h)}
      ctx.fillStyle=hexA(c,.07);ctx.fillRect(Math.max(0,xb),top,PW-Math.max(0,xb),h);
      ctx.setLineDash([5,4]);ctx.strokeStyle=hexA(c,.8);ctx.lineWidth=1;ctx.strokeRect(Math.max(0,xa),top,PW-Math.max(0,xa),h);ctx.setLineDash([]);
      lab("Kutu "+Math.max(a.p,b.p)+"–"+Math.min(a.p,b.p),top,c);
    }else if(d.type==="fib"&&b){
      for(const L of CH_FIBS){const p=b.p+(a.p-b.p)*L;hl(p,(L===0||L===1)?c:hexA(c,.65),1,L===0||L===1?[]:[4,3],L+" ("+(+p.toFixed(2))+")")}
    }else if((d.type==="trend"||d.type==="ray")&&b){
      const x1=x(chMs(a.t)),y1=y(P(a.p)),x2=x(chMs(b.t)),y2=y(P(b.p));
      let ex=x2,ey=y2;if(d.type==="ray"&&x2!==x1){ex=PW;ey=y1+(y2-y1)*(PW-x1)/(x2-x1)}
      ctx.strokeStyle=c;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(ex,ey);ctx.stroke();
    }else if(d.type==="pos"&&d.pts.length>=3){
      const en=d.pts[0].p,stp=d.pts[1].p,tg=d.pts[2].p;
      hl(en,"#e6ebf2",1.6,[],"Giriş "+en);hl(stp,"#ff6b6b",1.4,[6,4],"Stop "+stp);hl(tg,"#3cf08a",1.4,[6,4],"Hedef "+tg);
    }
  }
}

/* ================= kare çizimi ================= */
let fpsE=60,lastF=0;
const cvEl=$("cv"),ctx=cvEl.getContext("2d");
function frame(ts){
  const dt=lastF?Math.min(200,ts-lastF):16;lastF=ts;
  fpsE+=((1000/Math.max(1,dt))-fpsE)*0.05;
  try{if(RP.on)replayTick(dt);draw(dt)}catch(e){console.error(e)}
  requestAnimationFrame(frame);
}
function halo(p,color,w,dash){
  ctx.setLineDash([]);ctx.strokeStyle="rgba(0,0,0,.75)";ctx.lineWidth=w+2.5;ctx.stroke(p);
  ctx.setLineDash(dash||[]);ctx.strokeStyle=color;ctx.lineWidth=w;ctx.stroke(p);ctx.setLineDash([]);
}
function chip(x0,y0,text,border){
  ctx.font="bold 10px system-ui";const w=ctx.measureText(text).width+8;
  ctx.fillStyle="rgba(8,12,24,.92)";ctx.strokeStyle=border;ctx.lineWidth=1.3;
  ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x0,y0-8,w,16,4);else ctx.rect(x0,y0-8,w,16);ctx.fill();ctx.stroke();
  ctx.fillStyle="#fff";ctx.textAlign="left";ctx.fillText(text,x0+4,y0+3.5);
}
