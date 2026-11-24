'use strict';
// ---------- Asya ATM modeli (ICT): saat ve kural motoru ----------
// Range 18:00-19:00 New York. Seviyenin disinda govde kapanisi = sweep, sonra iceride kapanis = geri alma.
// Sonraki mum seviyeye degip iceride kapanirsa kapanista giris. Stop: o mumun ucu (dar) ya da sweep ucu (genis).
// Hedef: range'in karsi ucu. Gece basina tek islem.
const ATM = { res:null, key:'', busy:false, err:'' };
if(S.atm == null) S.atm = true;
if(!S.atmN) S.atmN = 5;
if(!S.atmCut) S.atmCut = '02:00';
ATM.fNY = new Intl.DateTimeFormat('en-US', {timeZone:'America/New_York', hourCycle:'h23', year:'numeric', month:'numeric', day:'numeric', hour:'numeric', minute:'numeric'});
ATM.wall = ms => { const p = {}; for(const x of ATM.fNY.formatToParts(ms)) p[x.type] = +x.value; return Date.UTC(p.year, p.month-1, p.day, p.hour % 24, p.minute); };
ATM.ny = (y, m, d, hm) => { const [h, mi] = hm.split(':').map(Number); const W = Date.UTC(y, m-1, d, h, mi); const g = W - (ATM.wall(W) - W); return W - (ATM.wall(g) - g); };
ATM.nights = (now, n, cut) => {
  const w = new Date(ATM.wall(now)), out = [], ch = +String(cut).split(':')[0];
  for(let k = 0; k < 40 && out.length < n; k++){
    const d = new Date(Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate() - k)), Y = d.getUTCFullYear(), M = d.getUTCMonth() + 1, D = d.getUTCDate();
    if(d.getUTCDay() === 5 || d.getUTCDay() === 6) continue; // Cuma/Cumartesi aksami vadeli kapali
    const rs = ATM.ny(Y, M, D, '18:00'); if(rs > now) continue;
    const end = ATM.ny(Y, M, D + 1, '16:00');
    out.push({rs, re: ATM.ny(Y, M, D, '19:00'), cut: Math.min(end, ATM.ny(Y, M, D + (ch >= 19 ? 0 : 1), cut)), end});
  }
  return out.reverse();
};
// bars: {t,o,h,l,c} gercek UTC ms, artan sirada; iv: mum suresi (ms)
ATM.run = (bars, nt, iv, now, wide) => {
  const B = bars.filter(b => b.t + iv <= now), r = {nt, iv, st:'nodata', H:null, L:null};
  let H = -Infinity, L = Infinity, n = 0;
  for(const b of B) if(b.t >= nt.rs && b.t < nt.re){ if(b.h > H) H = b.h; if(b.l < L) L = b.l; n++; }
  if(n){ r.H = H; r.L = L; }
  if(now < nt.re){ if(n) r.st = 'forming'; return r; }
  if(n < 0.5 * (nt.re - nt.rs) / iv) return r;
  const sd = [{dir:1, lvl:L, tgt:H, s:0}, {dir:-1, lvl:H, tgt:L, s:0}];
  let tr = null, lastT = 0;
  for(const b of B){
    if(b.t < nt.re) continue;
    if(b.t >= nt.end) break;
    lastT = b.t + iv;
    if(!tr){
      if(b.t + iv > nt.cut) break;
      for(const x of sd){
        const out = x.dir > 0 ? b.c < x.lvl : b.c > x.lvl, inn = x.dir > 0 ? b.c > x.lvl : b.c < x.lvl, ex = x.dir > 0 ? b.l : b.h;
        if(x.s === 0){ if(out){ x.s = 1; x.ext = ex; x.extT = b.t; } continue; }
        if(x.dir > 0 ? ex < x.ext : ex > x.ext){ x.ext = ex; x.extT = b.t; }
        if(x.s === 1){ if(inn) x.s = 2; continue; }
        if(out){ x.s = 1; continue; }
        const touch = x.dir > 0 ? b.l <= x.lvl : b.h >= x.lvl;
        if(touch && inn && (x.tgt - b.c) * x.dir > 0){
          tr = {dir:x.dir, ext:x.ext, extT:x.extT, t:b.t + iv, en:b.c, st: wide ? x.ext : ex, tg:x.tgt};
          tr.rr = Math.abs(tr.tg - tr.en) / Math.abs(tr.en - tr.st);
          break;
        }
      }
    } else {
      const hs = tr.dir > 0 ? b.l <= tr.st : b.h >= tr.st, ht = tr.dir > 0 ? b.h >= tr.tg : b.l <= tr.tg;
      if(hs || ht){ tr.out = hs ? 'sl' : 'tp'; tr.x = hs ? tr.st : tr.tg; tr.xt = b.t + iv; break; } // ayni mumda ikisi: stop sayilir
      tr.x = b.c; tr.xt = b.t + iv;
    }
  }
  r.sides = sd;
  if(tr){
    if(!tr.out){ tr.out = now >= nt.end ? 'time' : 'open'; if(tr.x == null){ tr.x = tr.en; tr.xt = tr.t; } }
    tr.R = tr.out === 'tp' ? tr.rr : tr.out === 'sl' ? -1 : (tr.x - tr.en) * tr.dir / Math.abs(tr.en - tr.st);
    r.tr = tr; r.st = tr.out;
  } else if(now >= nt.cut || lastT >= nt.cut) r.st = 'none';
  else r.st = sd.some(x => x.s === 2) ? 'retest' : sd.some(x => x.s === 1) ? 'swept' : 'wait';
  return r;
};
