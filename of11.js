"use strict";
function stats(){
  if(S.bb==null){$("stats").innerHTML="";return}
  let bs=0,as=0;if(S.fine){for(const l of S.fine.b)bs+=l.sz;for(const l of S.fine.a)as+=l.sz}
  const tot=bs+as||1,imb=(bs-as)/tot*100,dec=decimals(S.tick||1),lp=S.last!=null?S.last:(S.bb+S.ba)/2;
  $("stats").innerHTML=
    `<span>Son <b>${lp.toFixed(dec)}</b></span><span>Spread <b>${(S.ba-S.bb).toFixed(dec)}</b></span>`+
    `<span>Defter <b class="${imb>=0?"pos":"neg"}">${imb>=0?"+":""}${imb.toFixed(0)}%</b></span>`+
    `<span>CVD <b class="${S.cvd>=0?"pos":"neg"}">${S.cvd>=0?"+":""}${S.cvd.toFixed(1)}</b></span>`+
    (S.vwNow?`<span>VWAP <b>${S.vwNow.m.toFixed(dec)}</b></span>`:"")+`<span>İşlem <b>${S.count}</b></span>`;
  $("bigA").textContent=isFinite(S.bigA)?"(oto "+fmt(S.bigA)+")":"(oto)";
  const wt=wallThr();$("wallA").textContent=+$("wallThr").value>0?"":isFinite(wt)?"(oto "+fmt(wt)+")":"(oto)";
  const mins=REC.ev.length?((REC.ev[REC.ev.length-1][1]-REC.ev[0][1])/60000).toFixed(1):"0";
  $("recInfo").textContent="Kayıtta "+mins+" dk veri";
}

/* ================= canlı bağlantı (Hyperliquid) ================= */
let wsF=null,wsC=null,userStop=true,retryT=null,pingT=null;
function closeAll(){
  for(const w of [wsF,wsC])if(w){w.onclose=null;w.onerror=null;try{w.close()}catch(e){}}
  wsF=wsC=null;clearTimeout(retryT);clearInterval(pingT);
}
function openWs(subs,kind,posts){
  const w=new WebSocket(WS_URL);
  w.onopen=()=>{for(const s of subs)w.send(JSON.stringify({method:"subscribe",subscription:s}));
    for(const p of posts||[])try{w.send(JSON.stringify(p))}catch(e){}};
  w.onmessage=ev=>{
    let m;try{m=JSON.parse(ev.data)}catch(e){return}
    if(m.channel==="error"){setStatus("Hata: "+JSON.stringify(m.data),"err");return}
    if(m.channel==="post"){
      const r=m.data&&m.data.response,pl=r&&r.payload,arr=pl&&(Array.isArray(pl)?pl:pl.data);
      if(Array.isArray(arr)&&histCandles==null){histCandles=arr;tryReady()}
      return;
    }
    if(m.channel!=="l2Book"&&m.channel!=="trades")return;
    const t=Date.now();
    // geçmiş ve kayıtlı oturum hazır olana kadar canlı mesajlar sırayla bekletilir
    if(!S.ready){liveQ.push([kind,m,t]);if(kind==="fine")tryReady();return}
    handleMsg(kind,m,t);
  };
  w.onerror=()=>setStatus("Bağlantı hatası, yeniden deneniyor...","err");
  w.onclose=()=>{if(!userStop){setStatus("Bağlantı koptu, yeniden bağlanıyor...","err");clearTimeout(retryT);retryT=setTimeout(()=>openLive(false),2500)}};
  return w;
}
function handleMsg(kind,m,t){
  if(m.channel==="l2Book"&&m.data&&m.data.levels){
    const L=m.data.levels,b=L[0].map(l=>({px:+l.px,sz:+l.sz})),a=L[1].map(l=>({px:+l.px,sz:+l.sz}));
    if(kind==="fine")onFine(b,a,t);else onCoarse(b,a,t);
    if(S.mode==="live")setStatus("Canlı: "+$("coin").value.trim()+" (Hyperliquid)"+(S.histInfo?" · "+S.histInfo:""),"live");
  }else if(m.channel==="trades"&&Array.isArray(m.data)){
    const arr=m.data.slice().sort((p,q)=>p.time-q.time);
    for(const tr of arr)onTrade(tr.time,+tr.px,+tr.sz,tr.side==="B");
  }
}

/* ---- gerçek geçmiş + kayıtlı oturum ---- */
const INFO_URL="https://api.hyperliquid.xyz/info",HIST_MS=4*3600*1000,SAVE_MS=30*60*1000;
let liveQ=[],histCandles=null,restored,histTimer=null;
function candleReq(coin){const now=Date.now();return {type:"candleSnapshot",req:{coin,interval:"1m",startTime:now-HIST_MS,endTime:now}}}
function tryReady(){
  if(S.ready||S.mode!=="live"||histCandles==null||restored===undefined)return;
  const fq=liveQ.find(q=>q[0]==="fine"&&q[1].channel==="l2Book");if(!fq)return;
  const L=fq[1].data.levels,b=L[0].map(l=>({px:+l.px,sz:+l.sz})),a=L[1].map(l=>({px:+l.px,sz:+l.sz}));
  const g=Math.min(minGap(b),minGap(a));if(isFinite(g))S.tick=+g.toPrecision(6);
  if(S.tick==null)return;
  SILENT=true;
  const now=Date.now(),evs=restored&&restored.ev||[];
  const rStart=evs.length?evs[0][1]:Infinity,rEnd=evs.length?evs[evs.length-1][1]:-Infinity;
  const cs=histCandles.map(c=>({t:+c.t,T:+c.T,o:+c.o,h:+c.h,l:+c.l,c:+c.c,v:+c.v})).filter(c=>isFinite(c.t)&&isFinite(c.c)).sort((p,q)=>p.t-q.t);
  let nh=0;
  for(const c of cs)if(c.T<rStart&&c.T<=now){addHist(c);nh++}
  if(evs.length){simulate(evs);
    for(const c of cs)if(c.t>rEnd&&c.T<=now){addHist(c);nh++}}
  SILENT=false;
  const parts=[];
  if(nh)parts.push("geçmiş "+(nh>=60?(nh/60).toFixed(1)+" sa":nh+" dk")+" (1 dk mum)");
  else parts.push("geçmiş alınamadı");
  if(evs.length){const mm=(rEnd-rStart)/60000;parts.push("önceki oturum "+(mm<1?"<1":mm.toFixed(0))+" dk geri yüklendi")}
  S.histInfo=parts.join(" · ");
  S.ready=true;HM.dirty=true;GR.ver=-1;FP.ver=-1;
  const q=liveQ;liveQ=[];for(const [kind,m,t] of q)handleMsg(kind,m,t);
}
// oturum telefona kaydedilir (IndexedDB); erişilemezse sessizce atlanır
function idb(){return new Promise((res,rej)=>{try{const r=indexedDB.open("xyzflow",1);r.onupgradeneeded=()=>r.result.createObjectStore("rec");r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}})}
async function idbGet(k){const db=await idb();return new Promise((res,rej)=>{const q=db.transaction("rec").objectStore("rec").get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function idbPut(k,v){const db=await idb();return new Promise((res,rej)=>{const tx=db.transaction("rec","readwrite");tx.objectStore("rec").put(v,k);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
function loadSaved(coin){
  return Promise.race([
    idbGet("live:"+coin).then(r=>r&&r.ev&&r.ev.length&&r.last>Date.now()-SAVE_MS?r:null).catch(()=>null),
    new Promise(res=>setTimeout(()=>res(null),2000))]);
}
