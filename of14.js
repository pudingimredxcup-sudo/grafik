"use strict";
/* ================= altın kaynağı: Binance XAUUSDT (yedek: Hyperliquid xyz:GOLD) =================
   Binance defteri 0.01 adımlıdır; harita için "satır" boyuna (vars. 0.10) toplanır.
   Yerel defter: REST anlık görüntü + 100 ms fark akışı (Binance'in önerdiği eşitleme yöntemi). */
const BN={book:null,buf:[],lastU:null,prevU:null,synced:false,ok:false,fallback:false,failT:null,emitT:null,resyncAt:0,G:0.1,dp:1,gen:0};
const BN_REST="https://fapi.binance.com/fapi/v1/",BN_WS="wss://fstream.binance.com/stream?streams=xauusdt@depth@100ms/xauusdt@aggTrade";
function srcFor(){if(SYMB!=="XAUUSD")return "hl";const v=$("xsrc").value;return v==="hl"?"hl":v==="bn"?"bn":BN.fallback?"hl":"bn"}
function srcLabel(){return srcFor()==="bn"?"Binance XAUUSDT (satır "+bnRow()+")":$("coin").value.trim()+" (Hyperliquid)"}
function bnRow(){const g=+$("xrow").value||0.1;BN.G=g;BN.dp=decimals(g);return g}
const bnPx=k=>+(k*BN.G).toFixed(BN.dp);
function bnHist(){
  fetch(BN_REST+"klines?symbol=XAUUSDT&interval=1m&limit="+Math.round(HIST_MS/60000)).then(r=>r.json())
    .then(a=>{if(Array.isArray(a)&&histCandles==null){histCandles=a.map(k=>({t:k[0],T:k[6],o:k[1],h:k[2],l:k[3],c:k[4],v:k[5]}));tryReady()}}).catch(()=>{});
}
function bnPush(m){const t=Date.now();if(!S.ready){liveQ.push(["fine",m,t]);tryReady();return}handleMsg("fine",m,t)}
function bnOpen(){
  const gen=++BN.gen;bnRow();
  BN.book={b:new Map(),a:new Map()};BN.buf=[];BN.lastU=null;BN.synced=false;BN.ok=false;
  let w;try{w=new WebSocket(BN_WS)}catch(e){return bnFail()}
  wsF=w;
  w.onopen=()=>bnSnap(gen);
  w.onmessage=ev=>{if(gen!==BN.gen)return;let m;try{m=JSON.parse(ev.data)}catch(e){return}const d=m&&m.data;if(!d)return;
    if(d.e==="aggTrade")bnTrade(d);else if(d.e==="depthUpdate")bnDiff(d,gen)};
  w.onerror=()=>{if(BN.ok)setStatus("Binance bağlantı hatası, yeniden deneniyor...","err")};
  w.onclose=()=>{if(userStop||gen!==BN.gen)return;if(!BN.ok)return bnFail();
    setStatus("Binance bağlantısı koptu, yeniden bağlanıyor...","err");clearTimeout(retryT);retryT=setTimeout(()=>openLive(false),2500)};
  clearInterval(BN.emitT);BN.emitT=setInterval(()=>{if(gen!==BN.gen||wsF!==w){clearInterval(BN.emitT);return}bnEmit()},SAMPLE);
  clearTimeout(BN.failT);BN.failT=setTimeout(()=>{if(gen===BN.gen&&wsF===w&&!BN.ok&&!userStop)bnFail()},10000);
}
function bnSnap(gen){
  fetch(BN_REST+"depth?symbol=XAUUSDT&limit=1000").then(r=>r.json()).then(s=>{
    if(gen!==BN.gen||!s||!Array.isArray(s.bids))return;
    const B=BN.book;B.b.clear();B.a.clear();
    for(const [p,q] of s.bids)if(+q>0)B.b.set(+p,+q);
    for(const [p,q] of s.asks)if(+q>0)B.a.set(+p,+q);
    BN.lastU=s.lastUpdateId;BN.synced=false;
    const buf=BN.buf;BN.buf=[];for(const d of buf)bnDiff(d,gen);
    BN.ok=true;
  }).catch(()=>{if(gen===BN.gen&&!BN.ok)bnFail()});
}
function bnDiff(d,gen){
  if(BN.lastU==null){BN.buf.push(d);if(BN.buf.length>3000)BN.buf.shift();return}
  if(d.u<BN.lastU)return;
  if(!BN.synced){if(d.U>BN.lastU+1&&d.pu>BN.lastU)return bnResync(d,gen);BN.synced=true}
  else if(d.pu!==BN.prevU)return bnResync(d,gen);
  BN.prevU=d.u;
  const B=BN.book;
  for(const [p,q] of d.b){const v=+q;if(v>0)B.b.set(+p,v);else B.b.delete(+p)}
  for(const [p,q] of d.a){const v=+q;if(v>0)B.a.set(+p,v);else B.a.delete(+p)}
}
function bnResync(d,gen){
  BN.lastU=null;BN.synced=false;BN.buf=[d];
  const now=Date.now();if(now-BN.resyncAt<3000)return setTimeout(()=>{if(gen===BN.gen&&BN.lastU==null)bnSnap(gen)},3000);
  BN.resyncAt=now;bnSnap(gen);
}
// defteri satır boyuna topla: alışlar aşağı, satışlar yukarı yuvarlanır (en iyi alış/satış hiç aynı satıra düşmez)
function bnEmit(){
  if(!BN.ok||BN.lastU==null)return;
  const B=BN.book;if(!B.b.size||!B.a.size)return;
  let bb=-Infinity,ba=Infinity;for(const p of B.b.keys())if(p>bb)bb=p;for(const p of B.a.keys())if(p<ba)ba=p;
  if(!(bb<ba))return;
  const inv=1/BN.G,N=60,kb0=Math.floor(bb*inv+1e-6),ka0=Math.ceil(ba*inv-1e-6),bs=new Map(),as=new Map();
  for(const [p,q] of B.b){const k=Math.floor(p*inv+1e-6);if(kb0-k<N)bs.set(k,(bs.get(k)||0)+q);else if(kb0-k>N*20)B.b.delete(p)}
  for(const [p,q] of B.a){const k=Math.ceil(p*inv-1e-6);if(k-ka0<N)as.set(k,(as.get(k)||0)+q);else if(k-ka0>N*20)B.a.delete(p)}
  const b=[...bs].sort((x,y)=>y[0]-x[0]).map(([k,s])=>({px:String(bnPx(k)),sz:s.toFixed(3)}));
  const a=[...as].sort((x,y)=>x[0]-y[0]).map(([k,s])=>({px:String(bnPx(k)),sz:s.toFixed(3)}));
  bnPush({channel:"l2Book",data:{levels:[b,a]}});
}
function bnTrade(d){
  const buy=!d.m,p=+d.p,inv=1/BN.G,k=buy?Math.ceil(p*inv-1e-6):Math.floor(p*inv+1e-6);
  bnPush({channel:"trades",data:[{time:d.T,px:String(bnPx(k)),sz:d.q,side:buy?"B":"A"}]});
}
function bnFail(){
  BN.gen++;
  if($("xsrc").value==="bn"){stopAll();setStatus("Binance XAUUSDT'ye bağlanılamadı. Ayarlar → Altın kaynağı: Otomatik ya da Hyperliquid seç.","err");return}
  BN.fallback=true;
  setStatus("Binance verisi gelmedi, Hyperliquid xyz:GOLD'a geçiliyor...","err");
  setTimeout(()=>{if(!userStop)openLive(true)},800);
}
