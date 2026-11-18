"use strict";
function detectAbsorption(t,px,sz,buy){
  if(!$("aAbs").checked||!S.tick)return;
  const key=(buy?"a":"b")+Math.round(px/S.tick);
  let w=S.abs.get(key);if(!w){w={list:[],sum:0};S.abs.set(key,w)}
  w.list.push({t,sz});w.sum+=sz;
  while(w.list.length&&w.list[0].t<t-8000){w.sum-=w.list[0].sz;w.list.shift()}
  if(S.abs.size>400)for(const [k,v] of S.abs)if(!v.list.length||v.list[v.list.length-1].t<t-8000)S.abs.delete(k);
  const big=bigThr();if(!isFinite(big))return;
  // fiyat tutunuyor mu: satıcı vuruyor ama bid hâlâ aynı seviyede / alıcı vuruyor ama ask aynı seviyede
  const held=buy?S.ba===px:S.bb===px;
  if(!held||t-w.list[0].t<1500)return;
  let disp=0;const lv=S.fine&&(buy?S.fine.a:S.fine.b).find(l=>l.px===px);if(lv)disp=lv.sz;
  const dk=key;const dm=Math.max(S.disp.get(dk)||0,disp);S.disp.set(dk,dm);
  const ice=dm>0&&w.sum>=dm*2.2&&w.sum>=big;
  if((w.sum>=big*3||ice)&&!throttled("abs"+key,t,20000))
    pushEvent({t,px,type:"abs",dir:buy?-1:1,
      text:(ice?"Iceberg ":"Absorption ")+(buy?"(satıcılar tuttu) ":"(alıcılar tuttu) ")+fmt(w.sum)+" @ "+px,short:ice?"ICE":"ABS"});
}
function detectBreakouts(t){
  if(!$("aBO").checked||S.last==null)return;
  const px=S.last,prev=S.prevPx;S.prevPx=px;if(prev==null)return;
  const look=+$("boLook").value*60000;
  if(t-S.firstT>=look*0.6){
    const a=lowerBound(S.trades,t-look),b=lowerBound(S.trades,t-10000);
    let hi=-Infinity,lo=Infinity,vol=0,rv=0,nh=0;
    // geçmiş mumlar da aralığa dahil (bağlanır bağlanmaz kırılım yakalanabilsin)
    for(let c=lowerBound(S.cols,t-look);c<S.cols.length&&S.cols[c].t<t-10000;c++){const k=S.cols[c];if(!k.hist)continue;
      nh++;if(k.hi>hi)hi=k.hi;if(k.lo<lo)lo=k.lo;vol+=k.v}
    if(b-a>20||nh>=2){
      for(let i=a;i<b;i++){const r=S.trades[i];if(r.px>hi)hi=r.px;if(r.px<lo)lo=r.px;vol+=r.sz}
      for(let i=b;i<S.trades.length;i++)rv+=S.trades[i].sz;
      const avg10=vol/Math.max(1,(look-10000)/10000),ok=rv>=avg10*1.2;
      if(prev<=hi&&px>hi&&ok&&!throttled("rngU",t,30000))pushEvent({t,px:hi,type:"bo",dir:1,text:"▲ Kırılım: "+$("boLook").value+" dk aralık tepesi "+hi,short:"tepe"});
      if(prev>=lo&&px<lo&&ok&&!throttled("rngD",t,30000))pushEvent({t,px:lo,type:"bo",dir:-1,text:"▼ Kırılım: "+$("boLook").value+" dk aralık dibi "+lo,short:"dip"});
    }
  }
  const va=S.va;
  if(va&&t-S.firstT>=120000){
    if(prev<=va.vah&&px>va.vah&&!throttled("vah",t,30000))pushEvent({t,px:va.vah,type:"bo",dir:1,text:"▲ VAH yukarı kırıldı "+va.vah,short:"VAH"});
    if(prev>=va.val&&px<va.val&&!throttled("val",t,30000))pushEvent({t,px:va.val,type:"bo",dir:-1,text:"▼ VAL aşağı kırıldı "+va.val,short:"VAL"});
  }
}
const EVC={bo:null,big:"#ffffff",wall:null,pull:"#ffa94d",abs:"#7ee8fa"};
function evColor(e){if(e.type==="bo"||e.type==="wall")return e.dir>0?"#3cf08a":"#ff5c70";return EVC[e.type]}
let toastT=null;
function pushEvent(e){
  S.events.push(e);if(S.events.length>400)S.events.splice(0,100);
  $("evn").textContent=S.events.length;
  if(SILENT)return;
  const tst=$("toast");tst.textContent=e.text;tst.style.borderColor=evColor(e);tst.classList.add("show");
  clearTimeout(toastT);toastT=setTimeout(()=>tst.classList.remove("show"),3200);
  if($("evlog").classList.contains("open"))renderLog();
  sfx(e);
}
function renderLog(){
  const L=$("evlog"),ev=S.events.slice(-80).reverse();
  L.innerHTML=ev.length?ev.map(e=>`<div><span style="color:#7d8898">${hhmmss(e.t)}</span> <b style="color:${evColor(e)}">${e.text}</b></div>`).join(""):"<div>Henüz olay yok.</div>";
}

/* ================= ses efektleri (WebAudio, dosya gerekmez) ================= */
let AC=null,MG=null;
function audioInit(){
  try{if(!AC){AC=new (window.AudioContext||window.webkitAudioContext)();MG=AC.createGain();MG.connect(AC.destination)}
    if(AC.state==="suspended")AC.resume();setVol()}catch(e){}
}
function setVol(){if(MG)MG.gain.value=Math.pow(+$("vol").value/100,1.5)}
function osc(type,f,t0,dur,g0,f1){
  const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t0);
  if(f1)o.frequency.exponentialRampToValueAtTime(f1,t0+dur);
  g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(g0,t0+0.006);g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  o.connect(g);g.connect(MG);o.start(t0);o.stop(t0+dur+0.05);
}
// zil: temel frekans + çan harmonikleri, uzun sönüm → "çın"
function bell(base,t0,amp){for(const [m,a,d] of [[1,0.45,1.5],[2.76,0.16,0.9],[5.4,0.07,0.5],[8.93,0.035,0.3]])osc("sine",base*m,t0,d,a*(amp||1))}
const SFX={
  boUp(){const t=AC.currentTime;bell(1568,t);bell(2093,t+0.1,0.8)},
  boDn(){const t=AC.currentTime;bell(1175,t);bell(880,t+0.1,0.8)},
  big(){const t=AC.currentTime;osc("triangle",950,t,0.13,0.45,360);osc("sine",170,t,0.14,0.45,80)},
  wall(){const t=AC.currentTime;osc("sine",660,t,0.09,0.28);osc("sine",990,t+0.1,0.13,0.28)},
  pull(){const t=AC.currentTime;osc("sawtooth",880,t,0.3,0.1,200)},
  abs(){const t=AC.currentTime;osc("square",230,t,0.08,0.12);osc("square",230,t+0.13,0.08,0.12)}
};
const VIB={bo:[60,40,60],big:[35],wall:[20,30,20],pull:[90],abs:[25,40,25,40,25]};
function sfx(e){
  if($("snd").checked&&AC){try{
    if(e.type==="bo")(e.dir>0?SFX.boUp:SFX.boDn)();else if(SFX[e.type])SFX[e.type]();
  }catch(x){}}
  if($("vib").checked&&navigator.vibrate)try{navigator.vibrate(VIB[e.type]||[30])}catch(x){}
}

/* ================= ısı haritası önbelleği ================= */
const HM={cv:document.createElement("canvas"),img:null,ver:-1,top:0,n:0,w:0,tA:0,tB:0,half:0,dirty:true};
HM.ctx=HM.cv.getContext("2d");
