'use strict';
// ---------- Asya ATM (aralik kirilimi): saat ve kural motoru ----------
// Range: Uskup 01:00-01:30, 5 dk mumlar. Araligin disinda kapanan ilk 5 dk mum = giris (kapanista), kirilim yonunde.
// SL: long'da giristen onceki son kirmizi 5 dk mumun dibi, short'ta son yesil 5 dk mumun tepesi. TP acik. Gunde tek islem.
const ATM = { res:null, key:'', busy:false, err:'', IV:300000, TZ:'Europe/Skopje' };
if(S.atm == null) S.atm = true;
if(!S.atmN) S.atmN = 5;
if(!S.atmR0) S.atmR0 = '01:00';
if(!S.atmR1) S.atmR1 = '01:30';
if(!S.atmCut2) S.atmCut2 = '09:00';
ATM.fL = new Intl.DateTimeFormat('en-US', {timeZone:ATM.TZ, hourCycle:'h23', year:'numeric', month:'numeric', day:'numeric', hour:'numeric', minute:'numeric'});
ATM.wall = ms => { const p = {}; for(const x of ATM.fL.formatToParts(ms)) p[x.type] = +x.value; return Date.UTC(p.year, p.month-1, p.day, p.hour % 24, p.minute); };
// Uskup saati -> gercek UTC ms (yaz/kis saati dahil)
ATM.at = (y, m, d, hm) => { const [h, mi] = hm.split(':').map(Number); const W = Date.UTC(y, m-1, d, h, mi); const g = W - (ATM.wall(W) - W); return W - (ATM.wall(g) - g); };
ATM.day = (Y, M, D, o) => {
  o = o || {};
  const rs = ATM.at(Y, M, D, o.r0 || S.atmR0 || '01:00'), re = ATM.at(Y, M, D, o.r1 || S.atmR1 || '01:30'), end = ATM.at(Y, M, D, '23:00');
  let cut = ATM.at(Y, M, D, o.cut || S.atmCut2 || '09:00'); if(cut <= re) cut = end;
  return {rs, re, cut: Math.min(cut, end), end, wd: new Date(Date.UTC(Y, M-1, D)).getUTCDay()};
};
ATM.nights = (now, n) => {
  const w = new Date(ATM.wall(now)), out = [];
  for(let k = 0; k < 40 && out.length < n; k++){
    const d = new Date(Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate() - k));
    const nt = ATM.day(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    if(nt.wd === 0 || nt.wd === 6) continue; // Cumartesi/Pazar gecesi vadeli kapali
    if(nt.rs > now) continue;
    out.push(nt);
  }
  return out.reverse();
};
// bars: {t,o,h,l,c} gercek UTC ms, artan sirada (range'den once birkac saat de olsun: SL mumu icin)
ATM.run = (bars, nt, iv, now) => {
  const B = bars.filter(b => b.t + iv <= now && b.t < nt.end), r = {nt, iv, st:'nodata', H:null, L:null};
  let H = -Infinity, L = Infinity, n = 0;
  for(const b of B) if(b.t >= nt.rs && b.t < nt.re){ if(b.h > H) H = b.h; if(b.l < L) L = b.l; n++; }
  if(n){ r.H = H; r.L = L; }
  if(now < nt.re){ if(n) r.st = 'forming'; return r; }
  if(n < 0.5 * (nt.re - nt.rs) / iv) return r;
  let tr = null, lastT = 0;
  for(let i = 0; i < B.length; i++){
    const b = B[i];
    if(b.t < nt.re) continue;
    lastT = b.t + iv;
    if(!tr){
      if(b.t + iv > nt.cut) break;
      const dir = b.c > H ? 1 : b.c < L ? -1 : 0; if(!dir) continue;
      let ref = null;
      for(let j = i - 1; j >= 0; j--){ const q = B[j]; if(dir > 0 ? q.c < q.o : q.c > q.o){ ref = q; break; } }
      const st = ref ? (dir > 0 ? ref.l : ref.h) : (dir > 0 ? L : H);
      tr = {dir, bT:b.t, t:b.t + iv, en:b.c, st, refT: ref ? ref.t : null, x:b.c, xt:b.t + iv, best:0};
      tr.risk = Math.abs(tr.en - tr.st) || 1e-9; tr.tg = tr.en + 2 * tr.risk * dir; // tg: sadece 2R referansi (TP acik)
    } else {
      if(tr.dir > 0 ? b.l <= tr.st : b.h >= tr.st){ tr.out = 'sl'; tr.x = tr.st; tr.xt = b.t + iv; break; }
      tr.best = Math.max(tr.best, tr.dir > 0 ? b.h - tr.en : tr.en - b.l); tr.x = b.c; tr.xt = b.t + iv;
    }
  }
  if(tr){
    if(!tr.out) tr.out = now >= nt.end ? 'time' : 'open';
    tr.R = tr.out === 'sl' ? -1 : (tr.x - tr.en) * tr.dir / tr.risk; tr.bestR = tr.best / tr.risk;
    r.tr = tr; r.st = tr.out;
  } else r.st = (now >= nt.cut || lastT >= nt.cut) ? 'none' : 'wait';
  return r;
};
