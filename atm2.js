'use strict';
// ---------- Asya ATM: veri ve yenileme (5 dk mumlar) ----------
ATM.keyNow = () => [S.sym, src && src.sym, S.off[S.sym], S.tz, S.atmN, S.atmR0, S.atmR1, S.atmCut2].join('|');
ATM.PRE = 3 * 3600000; // SL mumu araliktan once de olabilir: range'den 3 saat oncesini de al
ATM.sum = R => {
  const done = R.list.filter(r => r.tr && r.tr.out !== 'open');
  R.n = done.length; R.win = done.filter(r => r.tr.R > 0).length; R.sl = done.filter(r => r.tr.out === 'sl').length;
  R.sumR = done.reduce((a, r) => a + r.tr.R, 0);
  return R;
};
ATM.compute = async () => {
  const s = src, now = Date.now();
  const nts = ATM.nights(now, Math.max(1, Math.min(10, +S.atmN || 5)));
  if(!nts.length) return ATM.sum({list:[]});
  const b = await fetchRange(s, '5m', 300, nts[0].rs - ATM.PRE, Math.min(now + ATM.IV, nts[nts.length - 1].end));
  const list = nts.map(nt => ATM.run(b.filter(x => x.t >= nt.rs - ATM.PRE && x.t < nt.end), nt, ATM.IV, now));
  return ATM.sum({list});
};
ATM.check = () => {
  if(!S.atm || !src || ATM.busy) return;
  const k = ATM.keyNow(); if(k === ATM.key) return;
  ATM.key = k; ATM.busy = true; ATM.err = '';
  ATM.compute().then(R => { R.key = k; ATM.res = R; }).catch(e => { ATM.err = 'veri alınamadı (' + e.message + ')'; })
    .finally(() => { ATM.busy = false; dirty = true; });
};
// her dakika: bugunun durumunu tazele; yeni gun basladiysa hepsini yeniden hesapla
ATM.tick = async () => {
  if(!S.atm || document.hidden || ATM.busy || !src) return;
  if(ATM.err){ ATM.key = ''; dirty = true; return; }
  const R = ATM.res; if(!R || R.key !== ATM.keyNow()) return;
  const now = Date.now(), nt = ATM.nights(now, 1)[0], cur = R.list[R.list.length - 1];
  if(!nt) return;
  if(!cur || cur.nt.rs !== nt.rs){ ATM.key = ''; dirty = true; return; }
  if(['sl', 'time', 'none'].includes(cur.st)) return;
  ATM.busy = true;
  try{
    const b = await fetchRange(src, '5m', 300, nt.rs - ATM.PRE, Math.min(nt.end, now + ATM.IV));
    if(R === ATM.res){ R.list[R.list.length - 1] = ATM.run(b, cur.nt, ATM.IV, Date.now()); ATM.sum(R); }
  }catch(e){}
  ATM.busy = false; dirty = true;
};
setInterval(ATM.tick, 60000);
