"use strict";
/* ================= sembol değiştirme ================= */
function loadThr(){let th={};try{th=JSON.parse(localStorage.getItem("of_thr_"+SYMB)||"{}")}catch(e){}
  $("bigThr").value=th.big||0;$("wallThr").value=th.wall||0}
function saveThr(){try{localStorage.setItem("of_thr_"+SYMB,JSON.stringify({big:+$("bigThr").value||0,wall:+$("wallThr").value||0}))}catch(e){}}
function setSym(s,init){
  if(!SYM[s])s="US100";
  const was=init?null:S.mode;
  SYMB=s;$("sym").value=s;$("coin").value=SYM[s].hl;document.title=SYM[s].title;
  $("xgrp").style.display=s==="XAUUSD"?"":"none";
  loadThr();loadChartDrawings();
  if(init)return;
  try{localStorage.setItem("of_sym",s);const st=JSON.parse(localStorage.getItem("gx_settings")||"{}");st.sym=s;localStorage.setItem("gx_settings",JSON.stringify(st))}catch(e){}
  if(was==="replay")exitReplay(false);
  if(was==="live"||was==="demo"){stopAll();if(was==="live")openLive(true);else startDemo()}
  else if(was!=="replay"){S=freshState();resetView();setStatus(s+" seçildi. \"Bağlan\"a bas.","")}
}
(()=>{
  try{const x=JSON.parse(localStorage.getItem("of_xau")||"{}");if(x.src)$("xsrc").value=x.src;if(x.row)$("xrow").value=x.row}catch(e){}
  const saveX=()=>{try{localStorage.setItem("of_xau",JSON.stringify({src:$("xsrc").value,row:$("xrow").value}))}catch(e){}};
  $("xsrc").onchange=()=>{saveX();BN.fallback=false;if(S.mode==="live"&&SYMB==="XAUUSD")openLive(true)};
  $("xrow").onchange=()=>{saveX();if(S.mode==="live"&&srcFor()==="bn")openLive(true)};
  $("sym").onchange=()=>setSym($("sym").value,false);
  $("bigThr").addEventListener("change",saveThr);$("wallThr").addEventListener("change",saveThr);
  setSym(SYMB,true);
})();
