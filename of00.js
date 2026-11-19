"use strict";
/* ================= sembol ayarları (US100 / XAUUSD) =================
   Açılışta sembol: adres (?s=XAUUSD) > grafik sayfasında seçili sembol > son seçim > US100 */
const SYM={
  US100:{hl:"xyz:XYZ100",title:"US100 Likidite Haritası",demoMid:27315,demoSc:1},
  XAUUSD:{hl:"xyz:GOLD",title:"XAUUSD Likidite Haritası",demoMid:37900,demoSc:0.1}
};
let SYMB=(()=>{
  try{
    const q=(new URLSearchParams(location.search).get("s")||"").toUpperCase();if(SYM[q])return q;
    const st=JSON.parse(localStorage.getItem("gx_settings")||"{}");if(SYM[st.sym])return st.sym;
    const o=localStorage.getItem("of_sym");if(SYM[o])return o;
  }catch(e){}
  return "US100";
})();
