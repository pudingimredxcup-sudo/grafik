'use strict';
// ---------- çizim ayarları (TradingView gibi): renk, kalınlık, çizgi stili, dolgu, metin, uzatma, kilit, kopyala, varsayılan ----------
const PAL = ['#f5c542','#ff9800','#ef5350','#e91e63','#e040fb','#7e57c2','#2962ff','#00bcd4','#26a69a','#4caf50','#ffffff','#787b86'];
const TNAME = {trend:'Trend', ray:'Işın', hline:'Yatay çizgi', rect:'Kutu', fib:'Fibonacci', vp:'FRVP', pos:'Pozisyon'};
ICON.sty = '<path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" stroke-width="1.6"/><circle cx="16" cy="7" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="10" cy="17" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/>';
if(!S.sty || typeof S.sty !== 'object') S.sty = {};
const dashOf = (ls, w) => ls === 'dash' ? [6 + 2*w, 4 + w] : ls === 'dot' ? [Math.max(1, w), 2*w + 2] : [];
const selD = () => sel ? drawings.find(z => z.id === sel) : null;
const isHex = c => /^#[0-9a-f]{6}$/i.test(String(c || ''));
function txtAt(d, x, y, align, base){
  if(!d.txt) return;
  ctx.save(); ctx.setLineDash([]); ctx.font = `${+d.fs || 12}px -apple-system,Segoe UI,Roboto,sans-serif`; ctx.fillStyle = d.color || '#f5c542';
  ctx.textAlign = align || 'center'; ctx.textBaseline = base || 'bottom'; ctx.fillText(d.txt, x, y); ctx.restore();
}
function lockMark(d){
  if(!d.lock) return; const h = handlesOf(d)[0]; if(!h || h.x == null || h.y == null) return;
  label('🔒 kilitli', h.x + 10, h.y - 16, '#2a2f3a', '#fff');
}
const drawOne0 = drawOne;
drawOne = function(d, W, isSel){
  if(d.type === 'vp' || d.type === 'pos'){ drawOne0(d, W, isSel); if(isSel) lockMark(d); return; }
  const P = d.pts.map(toXY);
  if(P.some(p => p.x == null || p.y == null) || (d.type !== 'hline' && !P[1])) return;
  const c = d.color || '#f5c542', lw = +d.lw || 1.5;
  ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = isSel ? lw + 0.5 : lw; ctx.setLineDash(dashOf(d.ls, lw));
  if(d.type === 'trend' || d.type === 'ray'){
    const [a, b] = P, ext = d.type === 'ray' ? 'right' : (d.ext || 'none');
    let A = a, B = b;
    if(ext !== 'none' && Math.abs(b.x - a.x) > 0.5){
      const k = (b.y - a.y)/(b.x - a.x), f = b.x > a.x ? W : 0; B = {x:f, y:a.y + k*(f - a.x)};
      if(ext === 'both'){ const g = b.x > a.x ? 0 : W; A = {x:g, y:a.y + k*(g - a.x)}; }
    }
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    txtAt(d, (a.x + b.x)/2, Math.min(a.y, b.y) - 4);
  } else if(d.type === 'hline'){
    const y = P[0].y; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    if(d.axis !== false) axisLabels.push([fmt(d.pts[0].p), y, c]);
    txtAt(d, W - 6, y - 3, 'right');
  } else if(d.type === 'rect'){
    const [a, b] = P, x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
    const fa = d.fa != null ? +d.fa : 0.14;
    if(fa > 0){ ctx.fillStyle = hexA(c, fa); ctx.fillRect(x, y, w, h); }
    ctx.strokeRect(x, y, w, h);
    txtAt(d, x + w/2, y + h/2, 'center', 'middle');
  } else if(d.type === 'fib'){
    const [a, b] = P, p1 = d.pts[0].p, p2 = d.pts[1].p; let x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x); if(x1 - x0 < 80) x1 = x0 + 80;
    const yAt = L => series.priceToCoordinate(p2 + (p1 - p2)*L), y618 = yAt(0.618), y786 = yAt(0.786), fa = d.fa != null ? +d.fa : 0.10;
    if(fa > 0 && y618 != null && y786 != null){ ctx.fillStyle = hexA(c, fa); ctx.fillRect(x0, Math.min(y618, y786), x1 - x0, Math.abs(y786 - y618)); }
    ctx.save(); ctx.setLineDash([4, 3]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore();
    for(const L of FIBS){
      const y = yAt(L); if(y == null) continue;
      ctx.strokeStyle = (L === 0 || L === 1) ? c : hexA(c, L < 0 ? 0.9 : 0.6);
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.fillStyle = c; ctx.font = '10px -apple-system,Segoe UI,Roboto,sans-serif'; ctx.textBaseline = 'bottom'; ctx.textAlign = 'left';
      ctx.fillText(`${L} (${fmt(p2 + (p1 - p2)*L)})`, x0 + 2, y - 1);
    }
  }
  ctx.restore();
  if(isSel){
    for(const h of handlesOf(d)){ if(h.x == null || h.y == null) continue; ctx.beginPath(); ctx.arc(h.x, h.y, 6, 0, Math.PI*2); ctx.fillStyle = '#0f1115'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([]); ctx.stroke(); }
    lockMark(d);
  }
};
// uzatılmış trend çizgisi uzatılan kısmından da seçilebilsin
const hit0 = hit;
hit = function(d, x, y){
  if(d.type === 'trend' && d.ext && d.ext !== 'none'){
    const P = d.pts.map(toXY), W = paneSize().w; if(P.some(p => p.x == null || p.y == null)) return false;
    const [a, b] = P; if(Math.abs(b.x - a.x) < 0.5) return distSeg(x, y, a, b) < 14;
    const k = (b.y - a.y)/(b.x - a.x), f = b.x > a.x ? W : 0, g = d.ext === 'both' ? (b.x > a.x ? 0 : W) : a.x;
    return distSeg(x, y, {x:g, y:a.y + k*(g - a.x)}, {x:f, y:a.y + k*(f - a.x)}) < 14;
  }
  return hit0(d, x, y);
};
// yeni çizimler, o araç için kaydedilen varsayılan ayarlarla başlar
const STYK = ['lw', 'ls', 'fa', 'ext', 'axis', 'fs'];
const bd0 = buildDrawing;
buildDrawing = function(type, pts, color){
  const d = bd0(type, pts, color), st = S.sty[type];
  if(st && type !== 'pos') for(const k of STYK) if(st[k] != null) d[k] = st[k];
  return d;
};
// kilitli çizim taşınmaz; seçili çizime çift dokunuş ayar panelini açar
let tapXY = null, tapT = 0, tapId = null;
wrap.addEventListener('pointerdown', e => {
  if(drag && drag.d && drag.d.lock){ drag = null; setStatus('Çizim kilitli. Taşımak için Stil → Kilitle işaretini kaldır.'); }
  const r = wrap.getBoundingClientRect(); tapXY = {x:e.clientX - r.left, y:e.clientY - r.top, m:mode};
}, true);
wrap.addEventListener('pointerup', e => {
  if(mode !== 'cursor' || !tapXY || tapXY.m !== 'cursor') return;
  const r = wrap.getBoundingClientRect();
  if(Math.hypot(e.clientX - r.left - tapXY.x, e.clientY - r.top - tapXY.y) > 12) return;
  const now = Date.now();
  if(sel && sel === tapId && now - tapT < 400){ tapT = 0; openSty(); return; }
  tapId = sel; tapT = now;
});
// ---------- ayar paneli ----------
(function(){
  const css = document.createElement('style');
  css.textContent = '.sw{width:30px;height:30px;border-radius:50%;border:2px solid #0000;outline:1px solid #fff3;cursor:pointer;padding:0}.sw.on{border-color:#fff}'
    + '.seg2{display:flex;flex-wrap:wrap;gap:6px}.seg2 button{background:#1c2029;border:1px solid #2c3240;border-radius:7px;padding:7px 10px;cursor:pointer;min-width:46px}.seg2 button.on{background:#2962ff;border-color:#2962ff;color:#fff}'
    + '#stySh input[type=color]{width:42px;height:32px;border:0;background:none;padding:0}#stySh input[type=range]{flex:1}#stySh select{padding:6px}';
  document.head.appendChild(css);
  const m = document.createElement('div'); m.className = 'modal hidden'; m.id = 'styM'; m.style.background = '#0004';
  m.innerHTML = '<div class="sheet" id="stySh"></div>'; document.body.appendChild(m);
  m.onclick = e => { if(e.target === m) m.classList.add('hidden'); };
})();
function openSty(){
  const d = selD(); if(!d){ setStatus('Önce ayarlanacak çizime dokun.'); return; }
  const T = d.type, lw = +d.lw || 1.5, line = T !== 'pos' && T !== 'vp';
  const seg = (id, opts, cur) => `<div class="seg2" id="${id}">` + opts.map(([v, t]) => `<button data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${t}</button>`).join('') + '</div>';
  let h = `<h3>${TNAME[T] || T} ayarları</h3>`;
  if(line){
    h += '<label>Renk</label><div class="row" style="flex-wrap:wrap">'
      + PAL.map(c => `<button class="sw${String(d.color || '').toLowerCase() === c ? ' on' : ''}" data-c="${c}" style="background:${c}" aria-label="renk ${c}"></button>`).join('')
      + '<input type="color" id="styC" aria-label="özel renk"></div>';
    h += '<label>Kalınlık</label>' + seg('styW', [[1, '1px'], [1.5, '1.5px'], [2, '2px'], [3, '3px'], [4, '4px']], lw);
    h += '<label>Çizgi stili</label>' + seg('styL', [['solid', '━━ düz'], ['dash', '- - kesik'], ['dot', '··· noktalı']], d.ls || 'solid');
    if(T === 'rect' || T === 'fib'){
      const fa = Math.round(100*(d.fa != null ? +d.fa : (T === 'fib' ? 0.10 : 0.14)));
      h += `<label>Dolgu opaklığı: <b id="styFv">%${fa}</b></label><div class="row"><input type="range" id="styF" min="0" max="60" value="${fa}"></div>`;
    }
    if(T === 'trend') h += '<label>Uzat</label>' + seg('styE', [['none', 'Yok'], ['right', 'Sağa'], ['both', 'İki yöne']], d.ext || 'none');
    if(T === 'hline') h += `<div class="row"><input type="checkbox" id="styA"${d.axis !== false ? ' checked' : ''}><span>Fiyatı sağdaki eksende göster</span></div>`;
    if(T !== 'fib'){
      h += '<label>Metin</label><div class="row"><input type="text" id="styT" maxlength="80" placeholder="ör. PDH, destek, giriş bölgesi" style="flex:1">'
        + '<select id="styS">' + [10, 12, 14, 18, 24].map(s => `<option value="${s}"${(+d.fs || 12) === s ? ' selected' : ''}>${s}</option>`).join('') + '</select></div>';
    }
  } else h += `<div class="note">${T === 'pos' ? 'Pozisyon kutusunun renkleri sabit (yeşil hedef, kırmızı stop).' : 'FRVP renkleri sabit; satır sayısı ve Value Area % ⚙ Ayarlar\'da.'} Buradan kilitleyebilir, kopyalayabilir ya da silebilirsin.</div>`;
  h += `<div class="row" style="margin-top:12px"><input type="checkbox" id="styK"${d.lock ? ' checked' : ''}><span>Kilitle (yanlışlıkla taşınmasın)</span></div>`;
  h += '<div class="row" style="flex-wrap:wrap"><button class="btn sec" id="styCp">Kopyala</button>'
    + (line ? '<button class="btn sec" id="styDef">Varsayılan yap</button>' : '')
    + '<button class="btn sec" id="styDel" style="background:#8e2f2d">Sil</button><button class="btn" id="styX">Kapat</button></div>';
  if(line) h += `<div class="note">Varsayılan yap: yeni ${TNAME[T]} çizimleri bu kalınlık, stil ve renkle başlar.</div>`;
  const sh = $('stySh'); sh.innerHTML = h; $('styM').classList.remove('hidden');
  const save = rebuild => { saveDrawings(); dirty = true; buildTools(); if(rebuild) openSty(); };
  const q = s => sh.querySelector(s);
  sh.querySelectorAll('.sw').forEach(b => b.onclick = () => { d.color = b.dataset.c; S.color = d.color; saveS(); save(true); });
  if(q('#styC')){ q('#styC').value = isHex(d.color) ? d.color : '#f5c542'; q('#styC').oninput = e => { d.color = e.target.value; S.color = d.color; saveS(); save(false); }; }
  const segOn = (id, fn) => { const el = q('#' + id); if(el) el.querySelectorAll('button').forEach(b => b.onclick = () => { fn(b.dataset.v); save(true); }); };
  segOn('styW', v => { d.lw = +v; });
  segOn('styL', v => { d.ls = v; });
  segOn('styE', v => { d.ext = v; });
  if(q('#styF')) q('#styF').oninput = e => { d.fa = +e.target.value/100; q('#styFv').textContent = '%' + e.target.value; save(false); };
  if(q('#styA')) q('#styA').onchange = e => { d.axis = e.target.checked; save(false); };
  if(q('#styT')){ q('#styT').value = d.txt || ''; q('#styT').oninput = e => { d.txt = e.target.value.slice(0, 80); save(false); }; }
  if(q('#styS')) q('#styS').onchange = e => { d.fs = +e.target.value; save(false); };
  q('#styK').onchange = e => { d.lock = e.target.checked; save(false); };
  q('#styCp').onclick = () => {
    const cp = JSON.parse(JSON.stringify(d)); cp.id = uid(); cp.lock = false; delete cp.orb; delete cp.atm;
    cp.pts.forEach(p => { p.t = l2t(t2l(p.t) + 5); });
    drawings.push(cp); sel = cp.id; syncLock(); save(false); $('styM').classList.add('hidden');
    setStatus('Kopya 5 mum sağa eklendi ve seçildi; sürükleyerek yerleştir.');
  };
  if(q('#styDef')) q('#styDef').onclick = () => {
    const st = {}; for(const k of STYK) if(d[k] != null) st[k] = d[k];
    S.sty[T] = st; if(d.color) S.color = d.color; saveS(); buildTools();
    setStatus(`Yeni ${TNAME[T]} çizimleri bu ayarlarla başlayacak.`);
  };
  q('#styDel').onclick = () => { drawings = drawings.filter(z => z.id !== d.id); sel = null; saveDrawings(); syncLock(); buildTools(); dirty = true; $('styM').classList.add('hidden'); showDataStatus(); };
  q('#styX').onclick = () => $('styM').classList.add('hidden');
}
// araç çubuğu: "Stil" düğmesi (Renk ile Sil arasında)
const styBuildTools0 = buildTools;
buildTools = function(){
  styBuildTools0();
  const nav = $('tools'), b = document.createElement('button');
  b.innerHTML = svg('sty') + '<span>Stil</span>'; b.onclick = openSty; if(!sel) b.style.opacity = '.45';
  const del = [...nav.children].find(x => x.textContent === 'Sil');
  nav.insertBefore(b, del || null);
};
buildTools(); dirty = true;
