"use strict";
function startReplay(rec){
  if(!rec||!rec.ev||rec.ev.length<10){setStatus("Oynatılacak kayıt yok. Önce Bağlan ya da Demo ile veri topla.","err");return}
  userStop=true;closeAll();if(demoT){clearInterval(demoT);demoT=null}
  RP.ev=rec.ev.slice().sort((a,b)=>a[1]-b[1]);RP.t0=RP.ev[0][1];RP.t1=RP.ev[RP.ev.length-1][1];
  RP.on=true;RP.playing=true;RP.speed=+$("rspd").value;replayReset();
  // ilk 15 saniyeyi sessizce yükle ki ekran boş başlamasın
  SILENT=true;advanceTo(Math.min(RP.t1,RP.t0+15000));SILENT=false;
  $("rbar").classList.add("open");$("rpp").textContent="⏸";$("go").textContent="Bağlan";
  setStatus("TEKRAR OYNATMA: "+(rec.coin||"")+" "+hhmmss(RP.t0)+"–"+hhmmss(RP.t1),"rep");
}
function replayTick(dt){
  if(!RP.playing)return;
  const T=Math.min(RP.t1,RP.clock+dt*RP.speed);
  // hızlı oynatmada çok sayıda olay sesi üst üste binmesin
  SILENT=RP.speed>10;advanceTo(T);SILENT=false;
  if(T>=RP.t1){RP.playing=false;$("rpp").textContent="▶"}
}
function seekTo(T){
  SILENT=true;
  if(T<RP.clock)replayReset();
  advanceTo(T);SILENT=false;HM.dirty=true;
}
function exitReplay(quiet){
  if(!RP.on)return;RP.on=false;$("rbar").classList.remove("open");
  if(!quiet){S=freshState();resetView();setStatus("Tekrar oynatma kapandı.","")}
}

/* ================= dokunma / yakınlaştırma ================= */
const ptrs=new Map();let lastTap=0,pinch0=null;
function markManual(zoom){S.autoZoom=false;if(!zoom)S.autoCenter=false;$("zc").classList.remove("on")}
cvEl.addEventListener("pointerdown",e=>{
  audioInit();
  cvEl.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch0={d:Math.hypot(a.x-b.x,a.y-b.y),h:S.half}}
  if(ptrs.size===1){const t=Date.now();if(t-lastTap<300)autoView();lastTap=t}
});
cvEl.addEventListener("pointermove",e=>{
  const p=ptrs.get(e.pointerId);if(!p)return;
  if(ptrs.size===1&&S.tick){const dy=e.clientY-p.y;if(dy!==0){S.center+=dy/S.rowH*S.tick;S.target=S.center;markManual(false)}}
  p.x=e.clientX;p.y=e.clientY;
  if(ptrs.size===2&&pinch0){const [a,b]=[...ptrs.values()],d=Math.hypot(a.x-b.x,a.y-b.y);
    if(d>10){S.half=Math.max(6,Math.min(HALF-10,pinch0.h*pinch0.d/d));markManual(true)}}
});
const up=e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)pinch0=null};
cvEl.addEventListener("pointerup",up);cvEl.addEventListener("pointercancel",up);
cvEl.addEventListener("wheel",e=>{e.preventDefault();S.half=Math.max(6,Math.min(HALF-10,S.half*(e.deltaY>0?1.12:0.89)));markManual(true)},{passive:false});
function autoView(){S.autoZoom=true;S.autoCenter=true;$("zc").classList.add("on")}
$("zin").onclick=()=>{S.half=Math.max(6,S.half*0.75);markManual(true)};
$("zout").onclick=()=>{S.half=Math.min(HALF-10,S.half*1.33);markManual(true)};
$("zc").onclick=autoView;

/* ================= kontroller ================= */
document.addEventListener("click",audioInit,{capture:true});
$("go").onclick=()=>{if(S.mode==="live")stopAll();else openLive(true)};
$("demo").onclick=startDemo;
$("gear").onclick=()=>$("set").classList.toggle("open");
$("bell").onclick=()=>{const L=$("evlog");L.classList.toggle("open");if(L.classList.contains("open"))renderLog()};
const showV=()=>{$("upperV").textContent=$("upper").value+"%";$("lowerV").textContent=$("lower").value+"%";S.thrInit=false;HM.dirty=true};
$("upper").oninput=showV;$("lower").oninput=showV;showV();
$("pal").onchange=()=>buildLUT($("pal").value);
$("bstyle").onchange=()=>SP.clear();
$("win").onchange=()=>{HM.dirty=true;GR.ver=-1;FP.ver=-1};
$("view").onchange=()=>{FP.ver=-1;HM.dirty=true};
$("coarse").onchange=()=>rebuild();
$("vol").oninput=setVol;
$("sndTest").onclick=()=>{audioInit();const seq=[["boUp",0],["boDn",900],["big",1800],["wall",2400],["pull",3000],["abs",3700]];
  for(const [k,d] of seq)setTimeout(()=>{try{SFX[k]()}catch(e){}},d)};
$("rplayBtn").onclick=()=>startReplay({coin:REC.coin,ev:REC.ev});
$("rsave").onclick=()=>{
  if(!REC.ev.length){setStatus("Kaydedilecek veri yok.","err");return}
  const blob=new Blob([JSON.stringify({v:1,coin:REC.coin,start:REC.ev[0][1],ev:REC.ev})],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);
  a.download="orderflow-"+(REC.coin||"kayit").replace(/[^a-z0-9]/gi,"_")+"-"+new Date(REC.ev[0][1]).toISOString().slice(0,16).replace(/[:T]/g,"-")+".json";
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000);
};
$("rloadBtn").onclick=()=>$("rload").click();
$("rload").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{try{const j=JSON.parse(r.result);startReplay(j)}catch(x){setStatus("Kayıt dosyası okunamadı.","err")}};r.readAsText(f);e.target.value=""};
$("rpp").onclick=()=>{if(RP.clock>=RP.t1){seekTo(RP.t0)}RP.playing=!RP.playing;$("rpp").textContent=RP.playing?"⏸":"▶"};
$("rspd").onchange=()=>{RP.speed=+$("rspd").value};
$("rseek").addEventListener("input",()=>{RP.drag=true;$("rtime").textContent=hhmmss(RP.t0+(RP.t1-RP.t0)*$("rseek").value/1000)});
$("rseek").addEventListener("change",()=>{RP.drag=false;seekTo(RP.t0+(RP.t1-RP.t0)*$("rseek").value/1000)});
$("rexit").onclick=()=>exitReplay(false);
buildLUT("pro");
setInterval(stats,300);
requestAnimationFrame(frame);
