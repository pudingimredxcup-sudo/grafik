'use strict';
// ---------- Asya ATM: arac cubugu dugmesi, ayarlar, cizim kancasi ----------
ICON.atm = '<rect x="3" y="7" width="8" height="10" fill="#ff9800" fill-opacity=".3" stroke="#ff9800" stroke-width="1.4"/><path d="M11 7H21M11 17H21" stroke="#ff9800" stroke-width="1.4" stroke-dasharray="2 2"/><path d="M14 13l2.5 2.5L21 10" fill="none" stroke="currentColor" stroke-width="1.6"/>';
const atmBuildTools0 = buildTools;
buildTools = function(){
  atmBuildTools0();
  const nav = $('tools'), b = document.createElement('button');
  b.innerHTML = svg('atm') + '<span>Asya ATM</span>'; if(S.atm) b.classList.add('on');
  b.onclick = () => { S.atm = !S.atm; saveS(); buildTools(); dirty = true; };
  nav.insertBefore(b, nav.querySelector('.sep'));
};
const atmRender0 = render;
render = function(){ atmRender0(); try{ atmDraw(); }catch(e){ console.error('ATM', e); } };
(function(){
  const row = $('sSave').parentNode, box = document.createElement('div');
  box.innerHTML = '<label>Asya ATM (Üsküp saati)</label>'
    + '<div class="row"><span>Range</span><input type="time" id="sAtmR0" style="width:105px"><span>–</span><input type="time" id="sAtmR1" style="width:105px"></div>'
    + '<div class="row"><span>Son giriş</span><input type="time" id="sAtmCut" style="width:105px"><span>Gün sayısı</span><input type="text" id="sAtmN" inputmode="numeric" style="width:55px"></div>'
    + '<div class="note">Range\'in (varsayılan 01:00–01:30) en yükseği ve en düşüğü işaretlenir. Dışında kapanan ilk 5 dk mumun kapanışında kırılım yönüne giriş. SL: long\'da girişten önceki son kırmızı 5 dk mumun dibi, short\'ta son yeşil 5 dk mumun tepesi. TP açık (gün 23:00\'te kapanır). Günde tek işlem; Cumartesi/Pazar atlanır.</div>';
  row.parentNode.insertBefore(box, row);
  const hm = v => { const c = String(v).trim(); return /^\d{1,2}:\d{2}$/.test(c) ? c.padStart(5, '0') : null; };
  $('btnSet').addEventListener('click', () => { $('sAtmN').value = S.atmN; $('sAtmR0').value = S.atmR0; $('sAtmR1').value = S.atmR1; $('sAtmCut').value = S.atmCut2; });
  $('sSave').addEventListener('click', () => {
    const n = parseInt($('sAtmN').value, 10); S.atmN = Math.max(1, Math.min(10, n || 5));
    const r0 = hm($('sAtmR0').value), r1 = hm($('sAtmR1').value), c = hm($('sAtmCut').value);
    if(r0 && r1 && r1 > r0){ S.atmR0 = r0; S.atmR1 = r1; }
    if(c) S.atmCut2 = c;
    saveS(); dirty = true;
  });
})();
(function(){ const d = document.createElement('div'); d.id = 'atmSr'; d.setAttribute('role', 'status'); d.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap'; document.body.appendChild(d); })();
buildTools(); dirty = true;
