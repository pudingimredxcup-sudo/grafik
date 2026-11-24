"use strict";
async function calc(sym, nt){
  const s = SY[sym], off = OFF(sym), now = Date.now();
  const cs = await candles(s.coin, "5m", nt.rs - 3 * 3600000, Math.min(now, nt.end));
  cs.forEach(c => { c.o += off; c.h += off; c.l += off; c.c += off; });
  const r = ATM.run(cs, nt, ATM.IV, now); RES[sym] = r; return card(sym, r);
}
// grafik cizimi: range kutusu + H/L isinlari ya da pozisyon kutusu (eski ATM cizimleri silinir)
const chartT = ms => Math.round(ms / 1000) - (S.tz === "local" ? new Date(ms).getTimezoneOffset() * 60 : 0);
function draw(sym){
  const r = RES[sym]; if(!r || r.H == null) return;
  const key = "gx_draw_" + sym; let ds = []; try{ ds = JSON.parse(localStorage.getItem(key) || "[]"); }catch(e){}
  ds = ds.filter(d => !d.atm);
  const id = () => "atm" + Math.random().toString(36).slice(2, 8), c = "#ff9800", t = r.tr;
  ds.push({id:id(), atm:1, type:"rect", color:c, pts:[{t:chartT(r.nt.rs), p:r.H}, {t:chartT(r.nt.re), p:r.L}]});
  if(t){
    const te = chartT(t.out === "open" ? Math.max(Date.now(), t.t + 30 * 60000) : Math.max(t.xt, t.t + 15 * 60000));
    ds.push({id:id(), atm:1, type:"pos", color:"#c9ced6", pts:[{t:chartT(t.t), p:t.en}, {t:te, p:t.st}, {t:te, p:t.tg}]});
  } else for(const p of [r.H, r.L]) ds.push({id:id(), atm:1, type:"ray", color:c, pts:[{t:chartT(r.nt.re), p}, {t:chartT(r.nt.re + 3600000), p}]});
  try{ localStorage.setItem(key, JSON.stringify(ds));
    const s = JSON.parse(localStorage.getItem("gx_settings") || "{}"); s.sym = sym; s.tf = "5m"; localStorage.setItem("gx_settings", JSON.stringify(s));
    location.href = "./"; }catch(e){ alert("Kaydedilemedi: " + e.message); }
}
let liveT = null;
async function run(){
  const day = $("day").value, cut = $("cut").value || S.atmCut2 || "09:00";
  try{ localStorage.setItem("atm_cfg2", JSON.stringify({cut})); }catch(e){}
  const nt = nightOf(day, cut);
  $("info").textContent = `${day} · range ${hm(nt.rs)}–${hm(nt.re)} Üsküp saati · son giriş ${hm(nt.cut)} · 5 dk mumlar` + (nt.wd === 0 || nt.wd === 6 ? " · hafta sonu gecesi vadeli kapalı, sonuç anlamsız olabilir" : "");
  if(Date.now() < nt.rs){ $("cards").innerHTML = `<div class="mut" style="padding:10px">Range henüz başlamadı (${hm(nt.rs)}).</div>`; return; }
  if(!$("cards").children.length) $("cards").innerHTML = '<div class="mut" style="padding:10px">Yükleniyor…</div>';
  const out = await Promise.all(Object.keys(SY).map(s => calc(s, nt).catch(e => `<div class="card"><h2>${s}</h2><div class="err">Veri alınamadı: ${e.message}</div></div>`)));
  $("cards").innerHTML = out.join("");
  for(const btn of document.querySelectorAll("[data-draw]")) btn.onclick = () => draw(btn.dataset.draw);
  clearTimeout(liveT); if(Date.now() < nt.end) liveT = setTimeout(() => { if(!document.hidden) run(); else liveT = setTimeout(run, 60000); }, 60000);
}
try{ const c = JSON.parse(localStorage.getItem("atm_cfg2") || "{}"); $("cut").value = c.cut || S.atmCut2 || "09:00"; }catch(e){}
{ const nt = ATM.nights(Date.now(), 1)[0]; $("day").value = new Date(ATM.wall(nt ? nt.rs : Date.now())).toISOString().slice(0, 10); }
$("go").onclick = () => { $("cards").innerHTML = ""; run(); };
run();
