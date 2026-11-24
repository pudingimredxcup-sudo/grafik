"use strict";
// ---------- Asya ATM sayfasi (ORB sayfasi gibi): kartlar + grafige cizim ----------
const $ = id => document.getElementById(id);
const SY = {US100:{coin:"xyz:XYZ100", dp:1}, XAUUSD:{coin:"xyz:GOLD", dp:2}};
const OFF = s => (S.off && +S.off[s]) || 0;
const hm = ms => new Intl.DateTimeFormat("tr-TR", {timeZone:ATM.TZ, hour:"2-digit", minute:"2-digit"}).format(ms);
const RES = {};
async function candles(coin, iv, a, b){
  const r = await fetch("https://api.hyperliquid.xyz/info", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({type:"candleSnapshot", req:{coin, interval:iv, startTime:a, endTime:b}})});
  const j = await r.json(); return (Array.isArray(j) ? j : []).map(c => ({t:+c.t, o:+c.o, h:+c.h, l:+c.l, c:+c.c})).sort((x, y) => x.t - y.t);
}
function nightOf(ds, cut){ const [Y, M, D] = ds.split("-").map(Number); return ATM.day(Y, M, D, {cut}); }
const row = (k, v) => `<tr><td>${k}</td><td>${v}</td></tr>`;
function card(sym, r){
  const s = SY[sym], f = v => v.toFixed(s.dp), off = OFF(sym), t = r.tr, sg = v => (v >= 0 ? "+" : "") + v.toFixed(2) + "R";
  let h = `<div class="card"><h2>${sym}<small>${s.coin}${off ? ` · fark ${off > 0 ? "+" : ""}${off}` : ""} · 5 dk</small></h2>`;
  if(r.H == null) return h + `<div class="st">Bu gün için veri yok.</div></div>`;
  h += `<table>${row("Range yükseği (H)", f(r.H))}${row("Range düşüğü (L)", f(r.L))}${row("Range", f(r.H - r.L))}</table>`;
  let st;
  switch(r.st){
    case "forming": st = `Range oluşuyor, ${hm(r.nt.re)}'de biter. Şimdilik H ${f(r.H)} / L ${f(r.L)}.`; break;
    case "nodata": st = "Range için yeterli veri yok."; break;
    case "wait": st = `Kırılım bekleniyor: H üstünde ya da L altında 5 dk kapanış. Son giriş ${hm(r.nt.cut)}.`; break;
    case "none": st = `Son giriş saatine (${hm(r.nt.cut)}) kadar kırılım olmadı.`; break;
    default: st = "";
  }
  if(t){
    const res = {sl:`<span class="dn">SL ✗ -1R</span> (${hm(t.xt)})`, open:`açık · şu an ${sg(t.R)}`, time:`gün bitti · ${sg(t.R)}`}[t.out];
    h += `<div class="sec ${t.dir > 0 ? "up" : "dn"}">${t.dir > 0 ? "LONG — yukarı kırılım" : "SHORT — aşağı kırılım"} · giriş ${hm(t.t)}</div>`;
    h += `<table>${row("Giriş (5 dk kapanış)", f(t.en))}${row(t.refT != null ? (t.dir > 0 ? "SL (son kırmızı mumun dibi)" : "SL (son yeşil mumun tepesi)") : "SL (range'in karşı ucu)", f(t.st) + ` <span class="mut">${t.refT != null ? hm(t.refT) : ""} · ${f(t.risk)}</span>`)}`
      + `${row("TP", `açık <span class="mut">(2R = ${f(t.tg)})</span>`)}${row("En iyi", sg(t.bestR))}${row("Sonuç", res)}</table>`;
  } else {
    h += `<div class="sec up">LONG — 5 dk kapanış ${f(r.H)} üstünde</div><table>${row("Giriş", "kırılım mumunun kapanışı")}${row("SL", "son kırmızı 5 dk mumun dibi")}${row("TP", "açık")}</table>`;
    h += `<div class="sec dn">SHORT — 5 dk kapanış ${f(r.L)} altında</div><table>${row("Giriş", "kırılım mumunun kapanışı")}${row("SL", "son yeşil 5 dk mumun tepesi")}${row("TP", "açık")}</table>`;
  }
  if(st) h += `<div class="st">${st}</div>`;
  return h + `<button data-draw="${sym}">Grafiğe çiz (${sym})</button></div>`;
}
