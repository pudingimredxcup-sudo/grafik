'use strict';
// ---------- Asya Sweep: veri ve yenileme ----------
ASW.keyNow = () => [S.sym, src && src.sym, S.off[S.sym], S.tz, S.aswN, S.aswCut, S.aswWide ? 1 : 0].join('|');
ASW.sum = R => {
  const done = R.list.filter(r => r.tr && r.tr.out !== 'open');
  R.n = done.length; R.tp = done.filter(r => r.tr.out === 'tp').length; R.sl = done.filter(r => r.tr.out === 'sl').length;
  R.sumR = done.reduce((a, r) => a + r.tr.R, 0); R.labs = [...new Set(R.list.map(r => r.lab))].join('/');
  return R;
};
ASW.compute = async () => {
  const s = src, now = Date.now(), wide = !!S.aswWide, list = [];
  const nts = ASW.nights(now, Math.max(1, Math.min(10, +S.aswN || 5)), S.aswCut || '02:00');
  if(s.kind === 'binance'){
    for(const nt of nts){
      const b = await fetchRange(s, '1m', 60, nt.rs, Math.min(nt.end, now + 60000));
      list.push(Object.assign(ASW.run(b, nt, 60000, now, wide), {lab:'1dk'}));
    }
  } else {
    // Hyperliquid sadece son 5000 mumu veriyor: 1dk yaklasik 3,4 gun; daha eski geceler 5dk ile
    const lim = now - 4900 * 60000, old = nts.filter(nt => nt.rs < lim), rec = nts.filter(nt => nt.rs >= lim);
    const b1 = rec.length ? await fetchRange(s, '1m', 60, rec[0].rs, now + 60000) : [];
    const b5 = old.length ? await fetchRange(s, '5m', 300, old[0].rs, Math.min(now + 60000, old[old.length - 1].end)) : [];
    for(const nt of nts){
      const one = nt.rs >= lim, B = (one ? b1 : b5).filter(b => b.t >= nt.rs && b.t < nt.end);
      list.push(Object.assign(ASW.run(B, nt, one ? 60000 : 300000, now, wide), {lab: one ? '1dk' : '5dk'}));
    }
  }
  return ASW.sum({list});
};
ASW.check = () => {
  if(!S.asw || !src || ASW.busy) return;
  const k = ASW.keyNow(); if(k === ASW.key) return;
  ASW.key = k; ASW.busy = true; ASW.err = '';
  ASW.compute().then(R => { R.key = k; ASW.res = R; }).catch(e => { ASW.err = 'veri alınamadı (' + e.message + ')'; })
    .finally(() => { ASW.busy = false; dirty = true; });
};
// her dakika: bu gecenin durumunu 1dk veriyle tazele; yeni gece basladiysa hepsini yeniden hesapla
ASW.tick = async () => {
  if(!S.asw || document.hidden || ASW.busy || !src) return;
  if(ASW.err){ ASW.key = ''; dirty = true; return; }
  const R = ASW.res; if(!R || R.key !== ASW.keyNow()) return;
  const now = Date.now(), nt = ASW.nights(now, 1, S.aswCut || '02:00')[0], cur = R.list[R.list.length - 1];
  if(!nt) return;
  if(!cur || cur.nt.rs !== nt.rs){ ASW.key = ''; dirty = true; return; }
  if(['tp', 'sl', 'time', 'none'].includes(cur.st)) return;
  ASW.busy = true;
  try{
    const b = await fetchRange(src, '1m', 60, nt.rs, Math.min(nt.end, now + 60000));
    if(R === ASW.res){ R.list[R.list.length - 1] = Object.assign(ASW.run(b, cur.nt, 60000, Date.now(), !!S.aswWide), {lab:'1dk'}); ASW.sum(R); }
  }catch(e){}
  ASW.busy = false; dirty = true;
};
setInterval(ASW.tick, 60000);
