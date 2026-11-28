"use strict";
async function calc(sym, nt, wide){
  const s = SY[sym], off = OFF(sym), now = Date.now(), b = Math.min(now, nt.end);
  let iv = 60000, cs = await candles(s.coin, "1m", nt.rs, b);
  if(!cs.some(c => c.t >= nt.rs && c.t < nt.re)){ cs = await candles(s.coin, "5m", nt.rs, b); iv = 300000; }
  cs.forEach(c => { c.o += off; c.h += off; c.l += off; c.c += off; });
  const r = ASW.run(cs, nt, iv, now, wide); RES[sym] = r; return card(sym, r);
}
// grafik cizimi: range kutusu + H/L isinlari ya da pozisyon kutusu (eski ATM cizimleri silinir)
const chartT = ms => Math.round(ms / 1000) - (S.tz === "local" ? new Date(ms).getTimezoneOffset() * 60 : 0);
function draw(sym){
  const r = RES[sym]; if(!r || r.H == null) return;
  const key = "gx_draw_" + sym; let ds = []; try{ ds = JSON.parse(localStorage.getItem(key) || "[]"); }catch(e){}
  ds = ds.filter(d => !d.asw);
  const id = () => "asw" + Math.random().toString(36).slice(2, 8), c = "#00bcd4", t = r.tr;
  ds.push({id:id(), asw:1, type:"rect", color:c, pts:[{t:chartT(r.nt.rs), p:r.H}, {t:chartT(r.nt.re), p:r.L}]});
  if(t){
    const te = chartT(t.out === "open" ? Math.max(Date.now(), t.t + 30 * 60000) : Math.max(t.xt, t.t + 15 * 60000));
    ds.push({id:id(), asw:1, type:"pos", color:"#c9ced6", pts:[{t:chartT(t.t), p:t.en}, {t:te, p:t.st}, {t:te, p:t.tg}]});
  } else for(const p of [r.H, r.L]) ds.push({id:id(), asw:1, type:"ray", color:c, pts:[{t:chartT(r.nt.re), p}, {t:chartT(r.nt.re + 3600000), p}]});
  try{ localStorage.setItem(key, JSON.stringify(ds));
    const s = JSON.parse(localStorage.getItem("gx_settings") || "{}"); s.sym = sym; localStorage.setItem("gx_settings", JSON.stringify(s));
    location.href = "./"; }catch(e){ alert("Kaydedilemedi: " + e.message); }
}
let liveT = null;
async function run(){
  const day = $("day").value, cut = $("cut").value || "02:00", wide = $("wide").checked;
  try{ localStorage.setItem("asw_cfg", JSON.stringify({cut, wide})); }catch(e){}
  const nt = nightOf(day, cut);
  $("info").textContent = `${day} · NY 18:00–19:00 = senin saatinle ${hm(nt.rs)}–${hm(nt.re)} · son giriş ${hm(nt.cut)}` + (nt.wd === 5 || nt.wd === 6 ? " · Cuma/Cumartesi akşamı vadeli kapalı, sonuç anlamsız olabilir" : "");
  if(!$("cards").children.length) $("cards").innerHTML = '<div class="mut" style="padding:10px">Yükleniyor…</div>';
  const out = await Promise.all(Object.keys(SY).map(s => calc(s, nt, wide).catch(e => `<div class="card"><h2>${s}</h2><div class="err">Veri alınamadı: ${e.message}</div></div>`)));
  $("cards").innerHTML = out.join("");
  for(const btn of document.querySelectorAll("[data-draw]")) btn.onclick = () => draw(btn.dataset.draw);
  clearTimeout(liveT); if(Date.now() < nt.end) liveT = setTimeout(() => { if(!document.hidden) run(); else liveT = setTimeout(run, 60000); }, 60000);
}
try{ const c = JSON.parse(localStorage.getItem("asw_cfg") || "{}"); if(c.cut) $("cut").value = c.cut; $("wide").checked = !!c.wide; }catch(e){}
{ const nt = ASW.nights(Date.now(), 1, $("cut").value || "02:00")[0], w = new Date(ASW.wall(nt ? nt.rs : Date.now())); $("day").value = w.toISOString().slice(0, 10); }
$("go").onclick = () => { $("cards").innerHTML = ""; run(); };
run();
