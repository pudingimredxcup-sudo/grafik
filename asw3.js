'use strict';
// ---------- Asya Sweep: grafik uzerine cizim ----------
ASW.dt = ms => ms / 1000 - (S.tz === 'local' ? new Date(ms).getTimezoneOffset() * 60 : 0);
// kutuphane kesirli indekste 0 donduruyor: iki mum arasini kendimiz araliyoruz
ASW.lx = l => { const i = Math.floor(l), a = ts.logicalToCoordinate(i); if(a == null || l === i) return a; const b = ts.logicalToCoordinate(i + 1); return b == null ? a : a + (l - i) * (b - a); };
ASW.x = ms => ASW.lx(t2l(ASW.dt(ms)));
ASW.hm = ms => new Intl.DateTimeFormat('tr-TR', {hour:'2-digit', minute:'2-digit', timeZone: S.tz === 'local' ? undefined : 'UTC'}).format(ms);
ASW.sg = v => (v >= 0 ? '+' : '') + v.toFixed(1) + 'R';
ASW.night = (r, W, last) => {
  if(r.H == null) return;
  const nt = r.nt, t = r.tr, now = Date.now();
  const x0 = ASW.x(nt.rs), x1 = ASW.x(Math.min(nt.re, now));
  const endMs = t ? (t.out === 'open' ? now : t.xt) : r.st === 'forming' ? Math.min(nt.re, now) : r.st === 'none' ? nt.cut : now;
  const xe = ASW.x(endMs), yH = series.priceToCoordinate(r.H), yL = series.priceToCoordinate(r.L);
  if([x0, x1, xe, yH, yL].some(v => v == null) || xe < 0 || x0 > W) return;
  ctx.setLineDash([]); ctx.lineWidth = 1; ctx.strokeStyle = '#00bcd4'; ctx.fillStyle = 'rgba(0,188,212,0.11)';
  ctx.fillRect(x0, yH, Math.max(2, x1 - x0), yL - yH); ctx.strokeRect(x0, yH, Math.max(2, x1 - x0), yL - yH);
  if(xe > x1){ ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(x1, yH); ctx.lineTo(xe, yH); ctx.moveTo(x1, yL); ctx.lineTo(xe, yL); ctx.stroke(); ctx.setLineDash([]); }
  if(last || tfSec <= 1800){
    label(`${ASW.hm(nt.rs)}–${ASW.hm(nt.re)} H ${fmt(r.H)}`, x0 - 3, yH, '#00707e', '#fff', 'right');
    label('L ' + fmt(r.L), x0 - 3, yL, '#00707e', '#fff', 'right');
  }
  const sw = t ? [t] : (r.sides || []).filter(x => x.s > 0);
  for(const s of sw){
    const x = ASW.x(s.extT), y = series.priceToCoordinate(s.ext); if(x == null || y == null) continue;
    ctx.fillStyle = '#e040fb'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
    label('sweep', x + 6, y + (s.dir > 0 ? 9 : -9), 'rgba(0,0,0,0)', '#e040fb');
  }
  if(!t) return;
  const xa = ASW.x(t.t), xb = ASW.x(endMs), ye = series.priceToCoordinate(t.en), ys = series.priceToCoordinate(t.st), yt = series.priceToCoordinate(t.tg);
  if([xa, xb, ye, ys, yt].some(v => v == null)) return;
  const w = Math.max(xb - xa, 24);
  ctx.fillStyle = 'rgba(38,166,154,0.26)'; ctx.fillRect(xa, Math.min(ye, yt), w, Math.abs(yt - ye));
  ctx.fillStyle = 'rgba(239,83,80,0.32)'; ctx.fillRect(xa, Math.min(ye, ys), w, Math.max(1, Math.abs(ys - ye)));
  ctx.strokeStyle = '#c9ced6'; ctx.beginPath(); ctx.moveTo(xa, ye); ctx.lineTo(xa + w, ye); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(xa, ye, 3, 0, 7); ctx.fill();
  const tag = {tp:'TP ✓', sl:'SL ✗', open:'açık', time:'süre doldu'}[t.out];
  const bg = t.out === 'tp' ? '#1f6f66' : t.out === 'sl' ? '#8e2f2d' : '#2a2f3a';
  label(`${t.dir > 0 ? 'LONG' : 'SHORT'} ${fmt(t.en)} · ${t.rr.toFixed(1)}R · ${tag} ${ASW.sg(t.R)}`, xa + 2, ye + (t.dir > 0 ? 10 : -10), bg, '#fff');
};
ASW.stText = r => {
  const t = r.tr, sd = k => (r.sides || []).find(z => z.s === k), nm = x => x.dir > 0 ? 'L' : 'H';
  switch(r.st){
    case 'forming': return `range oluşuyor · ${ASW.hm(r.nt.re)}'de biter`;
    case 'wait': return `sweep bekleniyor · son giriş ${ASW.hm(r.nt.cut)}`;
    case 'swept': return `${nm(sd(1))} sweep ✓ · geri alma bekleniyor`;
    case 'retest': return `${nm(sd(2))} geri alındı · ${fmt(sd(2).lvl)} retesti bekleniyor`;
    case 'open': return `${t.dir > 0 ? 'LONG' : 'SHORT'} açık · ${ASW.sg(t.R)}`;
    case 'tp': return 'TP ✓ ' + ASW.sg(t.R);
    case 'sl': return 'SL ✗ -1.0R';
    case 'time': return 'süre doldu · ' + ASW.sg(t.R);
    case 'none': return 'işlem çıkmadı';
    default: return 'veri yok';
  }
};
function aswDraw(){
  if(!S.asw || !bars.length) return;
  ASW.check();
  const {w, h} = paneSize(), R = ASW.res && ASW.res.key === ASW.keyNow() ? ASW.res : null, lines = [];
  if(R){
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
    R.list.forEach((r, i) => ASW.night(r, w, i === R.list.length - 1));
    ctx.restore();
    const cur = R.list[R.list.length - 1];
    if(cur && cur.H != null && ['forming', 'wait', 'swept', 'retest', 'open'].includes(cur.st)){ // bu gecenin H/L'si fiyat ekseninde
      const aw = wrap.clientWidth - w; ctx.save(); ctx.beginPath(); ctx.rect(w, 0, aw, h); ctx.clip();
      ctx.font = '11px -apple-system,Segoe UI,Roboto,sans-serif'; ctx.textBaseline = 'middle';
      for(const p of [cur.H, cur.L]){ const y = series.priceToCoordinate(p); if(y == null) continue; ctx.fillStyle = '#00bcd4'; ctx.fillRect(w, y - 9, aw, 18); ctx.fillStyle = '#000'; ctx.fillText(fmt(p), w + 6, y); }
      ctx.restore();
    }
    lines.push([`Sweep ${R.list.length} gece: ${R.n} işlem, ${R.tp} TP / ${R.sl} SL, ${ASW.sg(R.sumR)} (${R.labs})`, '#2a2f3a']);
    if(cur) lines.push([(Date.now() - cur.nt.rs < 23 * 3600000 ? 'Sweep bu gece: ' : 'Sweep son gece: ') + ASW.stText(cur), '#00707e']);
  }
  if(ASW.err) lines.push(['Sweep: ' + ASW.err, '#8e2f2d']);
  else if(!R) lines.push(['Sweep: hesaplanıyor…', '#2a2f3a']);
  let y = S.atm ? 64 : 28; for(const [t, bg] of lines){ label(t, 8, y, bg, '#fff'); y += 18; }
  // gorunmeyen durum satiri (ekran okuyucu + uzaktan okuma icin)
  const el = document.getElementById('aswSr'), cur = R && R.list[R.list.length - 1], t = cur && cur.tr;
  const txt = `Asya Sweep ${S.sym}: ` + lines.map(l => l[0]).join('. ') + (cur && cur.H != null ? `. H ${fmt(cur.H)} L ${fmt(cur.L)}` : '')
    + (t ? `. ${t.dir > 0 ? 'LONG' : 'SHORT'} giriş ${fmt(t.en)} stop ${fmt(t.st)} hedef ${fmt(t.tg)}` : '');
  if(el && el.textContent !== txt) el.textContent = txt;
}
