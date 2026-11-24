'use strict';
// ---------- Asya ATM: veri ve yenileme ----------
ATM.keyNow = () => [S.sym, src && src.sym, S.off[S.sym], S.tz, S.atmN, S.atmCut, S.atmWide ? 1 : 0].join('|');
ATM.sum = R => {
  const done = R.list.filter(r => r.tr && r.tr.out !== 'open');
  R.n = done.length; R.tp = done.filter(r => r.tr.out === 'tp').length; R.sl = done.filter(r => r.tr.out === 'sl').length;
  R.sumR = done.reduce((a, r) => a + r.tr.R, 0); R.labs = [...new Set(R.list.map(r => r.lab))].join('/');
  return R;
};
ATM.compute = async () => {
  const s = src, now = Date.now(), wide = !!S.atmWide, list = [];
  const nts = ATM.nights(now, Math.max(1, Math.min(10, +S.atmN || 5)), S.atmCut || '02:00');
  if(s.kind === 'binance'){
    for(const nt of nts){
      const b = await fetchRange(s, '1m', 60, nt.rs, Math.min(nt.end, now + 60000));
      list.push(Object.assign(ATM.run(b, nt, 60000, now, wide), {lab:'1dk'}));
    }
  } else {
    // Hyperliquid sadece son 5000 mumu veriyor: 1dk yaklasik 3,4 gun; daha eski geceler 5dk ile
    const lim = now - 4900 * 60000, old = nts.filter(nt => nt.rs < lim), rec = nts.filter(nt => nt.rs >= lim);
    const b1 = rec.length ? await fetchRange(s, '1m', 60, rec[0].rs, now + 60000) : [];
    const b5 = old.length ? await fetchRange(s, '5m', 300, old[0].rs, Math.min(now + 60000, old[old.length - 1].end)) : [];
    for(const nt of nts){
      const one = nt.rs >= lim, B = (one ? b1 : b5).filter(b => b.t >= nt.rs && b.t < nt.end);
      list.push(Object.assign(ATM.run(B, nt, one ? 60000 : 300000, now, wide), {lab: one ? '1dk' : '5dk'}));
    }
  }
  return ATM.sum({list});
};
ATM.check = () => {
  if(!S.atm || !src || ATM.busy) return;
  const k = ATM.keyNow(); if(k === ATM.key) return;
  ATM.key = k; ATM.busy = true; ATM.err = '';
  ATM.compute().then(R => { R.key = k; ATM.res = R; }).catch(e => { ATM.err = 'veri alınamadı (' + e.message + ')'; })
    .finally(() => { ATM.busy = false; dirty = true; });
};
// her dakika: bu gecenin durumunu 1dk veriyle tazele; yeni gece basladiysa hepsini yeniden hesapla
ATM.tick = async () => {
  if(!S.atm || document.hidden || ATM.busy || !src) return;
  if(ATM.err){ ATM.key = ''; dirty = true; return; }
  const R = ATM.res; if(!R || R.key !== ATM.keyNow()) return;
  const now = Date.now(), nt = ATM.nights(now, 1, S.atmCut || '02:00')[0], cur = R.list[R.list.length - 1];
  if(!nt) return;
  if(!cur || cur.nt.rs !== nt.rs){ ATM.key = ''; dirty = true; return; }
  if(['tp', 'sl', 'time', 'none'].includes(cur.st)) return;
  ATM.busy = true;
  try{
    const b = await fetchRange(src, '1m', 60, nt.rs, Math.min(nt.end, now + 60000));
    if(R === ATM.res){ R.list[R.list.length - 1] = Object.assign(ATM.run(b, cur.nt, 60000, Date.now(), !!S.atmWide), {lab:'1dk'}); ATM.sum(R); }
  }catch(e){}
  ATM.busy = false; dirty = true;
};
setInterval(ATM.tick, 60000);
