"use strict";
const $=id=>document.getElementById(id);
const WS_URL="wss://api.hyperliquid.xyz/ws";
const HALF=300,NROW=2*HALF+1,SAMPLE=500,MAXCOL=4000,TRADE_KEEP=65*60*1000,REC_KEEP=90*60*1000;
const BUY=[38,214,106],SELL=[255,66,88],NEUT=[206,210,220];
// her öğenin kendine ait rengi: palet mavi/altın, baloncuk yeşil/kırmızı/gri, POC macenta, VA lavanta, VWAP beyaz
const POC_C="#ff3edb",VA_C="#b9a2ff",VA_FILL="rgba(185,162,255,.09)",VW_C="#ffffff";

/* ================= saat (canlı / tekrar oynatma) ================= */
const RP={on:false,playing:true,ev:[],i:0,clock:0,nextCap:0,t0:0,t1:0,speed:5,drag:false};
const NOW=()=>RP.on?RP.clock:Date.now();
let SILENT=false;

/* ================= durum ================= */
let S;
function freshState(){
  return {tick:null,cstep:null,fine:null,coarse:null,cur:null,curBase:0,bb:null,ba:null,
    cols:[],colVer:0,trades:[],trVer:0,prof:new Map(),cvd:0,count:0,last:null,lastBuy:true,firstT:null,
    center:null,target:null,half:30,autoZoom:true,autoCenter:true,rowH:10,lo:0,hi:0,thrInit:false,mode:null,
    va:null,vw:{pv:0,v:0,p2:0},vwNow:null,sizes:[],bigA:Infinity,grp:null,walls:new Map(),abs:new Map(),disp:new Map(),
    events:[],throttle:new Map(),prevPx:null,profH:new Map(),ready:true,histInfo:""};
}
S=freshState();

/* ================= paletler ================= */
const PALETTES={
  pro:{bg:[7,12,26],stops:[[0,[10,20,46]],[.14,[14,40,92]],[.32,[26,76,150]],[.5,[70,128,200]],[.64,[150,190,232]],[.77,[222,196,110]],[.9,[255,210,60]],[1,[255,248,216]]]},
  klasik:{bg:[5,8,13],stops:[[0,[6,12,30]],[.12,[10,32,86]],[.3,[14,84,176]],[.46,[0,165,215]],[.6,[52,208,150]],[.72,[218,226,62]],[.84,[255,168,0]],[.94,[255,62,28]],[1,[255,242,228]]]},
  gri:{bg:[7,9,12],stops:[[0,[18,21,26]],[.5,[110,116,126]],[1,[250,250,250]]]}
};
let LUT=new Uint8ClampedArray(768),BG=[7,12,26],PALCSS=[];
function buildLUT(name){
  const P=PALETTES[name]||PALETTES.pro,st=P.stops;BG=P.bg;
  for(let i=0;i<256;i++){
    const v=i/255;let a=st[0],b=st[st.length-1];
    for(let j=0;j<st.length-1;j++)if(v>=st[j][0]&&v<=st[j+1][0]){a=st[j];b=st[j+1];break}
    const f=(v-a[0])/((b[0]-a[0])||1);
    for(let k=0;k<3;k++)LUT[i*3+k]=Math.round(a[1][k]+(b[1][k]-a[1][k])*f);
  }
  PALCSS=st.map(s=>[s[0],`rgb(${s[1].join(",")})`]);HM.dirty=true;
}

/* ================= yardımcılar ================= */
// küçük hacimler sıfıra yuvarlanmasın (gece 0.004 lotluk işlemler "0.00" görünüyordu)
function fmt(n){n=Math.abs(n);return n>=1e4?(n/1e3).toFixed(0)+"k":n>=1e3?(n/1e3).toFixed(1)+"k":n>=100?n.toFixed(0):n>=10?n.toFixed(1):n>=0.01?n.toFixed(2):n>0?String(+n.toPrecision(1)):"0"}
function setStatus(s,cls){$("status").textContent=s;$("dot").className=cls||""}
function niceStep(raw){const m=Math.pow(10,Math.floor(Math.log10(raw)));for(const k of [1,2,2.5,5,10])if(k*m>=raw)return k*m;return 10*m}
function decimals(t){const s=String(t);return s.includes(".")?s.split(".")[1].length:0}
function mix(a,b,f){return [0,1,2].map(i=>Math.round(a[i]+(b[i]-a[i])*f))}
function rgba(c,a){return `rgba(${c[0]},${c[1]},${c[2]},${a==null?1:a})`}
function lowerBound(arr,t){let lo=0,hi=arr.length;while(lo<hi){const m=(lo+hi)>>1;if(arr[m].t<t)lo=m+1;else hi=m}return lo}
function hhmmss(t){const d=new Date(t);return [d.getHours(),d.getMinutes(),d.getSeconds()].map(v=>String(v).padStart(2,"0")).join(":")}

/* ================= kayıt ================= */
let REC={coin:"",start:0,ev:[]};
function recPush(e){
  if(S.mode!=="live"&&S.mode!=="demo")return;
  REC.ev.push(e);
  if(REC.ev.length%500===0){const lim=e[1]-REC_KEEP;let n=0;while(n<REC.ev.length&&REC.ev[n][1]<lim)n++;if(n)REC.ev.splice(0,n)}
}
const flat=a=>{const o=[];for(const l of a)o.push(l.px,+l.sz.toFixed(5));return o};
const unflat=f=>{const o=[];for(let i=0;i<f.length;i+=2)o.push({px:f[i],sz:f[i+1]});return o};

/* ================= defter işleme ================= */
function minGap(arr){let g=Infinity;for(let i=1;i<arr.length;i++){const d=Math.abs(arr[i].px-arr[i-1].px);if(d>1e-12&&d<g)g=d}return g}
function onFine(b,a,t){
  if(!b.length||!a.length)return;
  recPush(["F",t,flat(b),flat(a)]);
  const g=Math.min(minGap(b),minGap(a));
  if(isFinite(g)){const r=+g.toPrecision(6);S.tick=S.tick==null?r:Math.min(S.tick,r)}
  S.fine={b,a};S.bb=b[0].px;S.ba=a[0].px;rebuild();
  detectWalls(t);
}
function onCoarse(b,a,t){
  if(!b.length||!a.length)return;
  recPush(["C",t,flat(b),flat(a)]);
  const g=Math.min(minGap(b),minGap(a));
  if(isFinite(g))S.cstep=+g.toPrecision(6);
  S.coarse={b,a};if(S.bb==null){S.bb=b[0].px;S.ba=a[0].px}
  rebuild();
}
function rebuild(){
  const t=S.tick;if(t==null||S.bb==null)return;
  const base=Math.round((S.bb+S.ba)/2/t)*t,arr=new Float32Array(NROW);
  const idx=p=>Math.round((p-base)/t)+HALF;
  if(S.coarse&&$("coarse").checked&&S.cstep>t*1.5){
    const k=Math.max(1,Math.round(S.cstep/t));
    for(const l of S.coarse.b){const i0=idx(l.px),per=l.sz/k;for(let j=0;j<k;j++){const i=i0+j;if(i>=0&&i<NROW)arr[i]-=per}}
    for(const l of S.coarse.a){const i0=idx(l.px),per=l.sz/k;for(let j=0;j<k;j++){const i=i0-j;if(i>=0&&i<NROW)arr[i]-=per}}
  }
  if(S.fine){
    const lo=idx(S.fine.b[S.fine.b.length-1].px),hi=idx(S.fine.a[S.fine.a.length-1].px);
    for(let i=Math.max(0,lo);i<=Math.min(NROW-1,hi);i++)arr[i]=0;
    for(const l of S.fine.b){const i=idx(l.px);if(i>=0&&i<NROW)arr[i]=l.sz}
    for(const l of S.fine.a){const i=idx(l.px);if(i>=0&&i<NROW)arr[i]=l.sz}
  }
  S.cur=arr;S.curBase=base;
}
// geçmiş (1 dk mum) hacmi + canlı işlem hacmi birlikte
