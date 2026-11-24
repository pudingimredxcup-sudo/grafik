"use strict";
// ---------- Asya ATM sayfasi (ORB sayfasi gibi): kartlar + grafige cizim ----------
const $ = id => document.getElementById(id);
const SY = {US100:{coin:"xyz:XYZ100", dp:1}, XAUUSD:{coin:"xyz:GOLD", dp:2}};
const OFF = s => (S.off && +S.off[s]) || 0;
const LOC = Intl.DateTimeFormat().resolvedOptions().timeZone;
const hm = ms => new Intl.DateTimeFormat("tr-TR", {timeZone:LOC, hour:"2-digit", minute:"2-digit"}).format(ms);
const RES = {};
async function candles(coin, iv, a, b){
  const r = await fetch("https://api.hyperliquid.xyz/info", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({type:"candleSnapshot", req:{coin, interval:iv, startTime:a, endTime:b}})});
  const j = await r.json(); return (Array.isArray(j) ? j : []).map(c => ({t:+c.t, o:+c.o, h:+c.h, l:+c.l, c:+c.c})).sort((x, y) => x.t - y.t);
}
function nightOf(ds, cut){
  const [Y, M, D] = ds.split("-").map(Number), ch = +cut.split(":")[0], end = ATM.ny(Y, M, D + 1, "16:00");
  return {rs:ATM.ny(Y, M, D, "18:00"), re:ATM.ny(Y, M, D, "19:00"), cut:Math.min(end, ATM.ny(Y, M, D + (ch >= 19 ? 0 : 1), cut)), end, wd:new Date(Date.UTC(Y, M - 1, D)).getUTCDay()};
}
const row = (k, v) => `<tr><td>${k}</td><td>${v}</td></tr>`;
function card(sym, r){
  const s = SY[sym], f = v => v.toFixed(s.dp), off = OFF(sym), t = r.tr, nm = x => x.dir > 0 ? "L" : "H";
  let h = `<div class="card"><h2>${sym}<small>${s.coin}${off ? ` · fark ${off > 0 ? "+" : ""}${off}` : ""} · ${r.iv / 60000} dk</small></h2>`;
  if(r.H == null) return h + `<div class="st">Bu gece için veri yok.</div></div>`;
  h += `<table>${row("Asya yükseği (H)", f(r.H))}${row("Asya düşüğü (L)", f(r.L))}${row("Range", f(r.H - r.L))}</table>`;
  const sd = k => (r.sides || []).find(z => z.s === k);
  let st;
  switch(r.st){
    case "forming": st = `Range oluşuyor, ${hm(r.nt.re)}'de biter. Şimdilik H ${f(r.H)} / L ${f(r.L)}.`; break;
    case "nodata": st = "Range için yeterli veri yok."; break;
    case "wait": st = `Sweep bekleniyor: H üstünde ya da L altında gövde kapanışı. Son giriş ${hm(r.nt.cut)}.`; break;
    case "swept": { const x = sd(1); st = `<span class="${x.dir > 0 ? "dn" : "up"}">${nm(x)} sweep ✓</span> (uç ${f(x.ext)}, ${hm(x.extT)}). Seviyenin içine kapanış bekleniyor.`; break; }
    case "retest": { const x = sd(2); st = `${nm(x)} geri alındı ✓. <b>${f(x.lvl)}</b> retesti bekleniyor: değip içeride kapanan mumda giriş (${x.dir > 0 ? "LONG" : "SHORT"}, hedef ${f(x.tgt)}).`; break; }
    case "none": st = `Son giriş saatine (${hm(r.nt.cut)}) kadar kurulum çıkmadı.`; break;
    default: st = "";
  }
  if(t){
    const res = {tp:`<span class="up">Hedef ✓ +${t.R.toFixed(1)}R</span> (${hm(t.xt)})`, sl:`<span class="dn">Stop ✗ -1R</span> (${hm(t.xt)})`, open:`açık · şu an ${t.R >= 0 ? "+" : ""}${t.R.toFixed(1)}R`, time:`süre doldu · ${t.R >= 0 ? "+" : ""}${t.R.toFixed(1)}R`}[t.out];
    h += `<div class="sec ${t.dir > 0 ? "up" : "dn"}">${t.dir > 0 ? "LONG" : "SHORT"} — ${nm(t)} sweep (uç ${f(t.ext)}) → retest → giriş ${hm(t.t)}</div>`;
    h += `<table>${row("Giriş", f(t.en))}${row("Stop", f(t.st) + ` <span class="mut">(${f(Math.abs(t.en - t.st))})</span>`)}${row("Hedef", f(t.tg) + ` <span class="mut">(${f(Math.abs(t.tg - t.en))})</span>`)}${row("R:R", t.rr.toFixed(2))}${row("Sonuç", res)}</table>`;
  } else {
    h += `<div class="sec up">LONG kurulumu</div><table>${row("L altında gövde kapanışı", f(r.L))}${row("Retest / giriş bölgesi", f(r.L))}${row("Hedef (H)", f(r.H))}</table>`;
    h += `<div class="sec dn">SHORT kurulumu</div><table>${row("H üstünde gövde kapanışı", f(r.H))}${row("Retest / giriş bölgesi", f(r.H))}${row("Hedef (L)", f(r.L))}</table>`;
  }
  if(st) h += `<div class="st">${st}</div>`;
  return h + `<button data-draw="${sym}">Grafiğe çiz (${sym})</button></div>`;
}
