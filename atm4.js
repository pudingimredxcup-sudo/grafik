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
  box.innerHTML = '<label>Asya ATM modeli</label>'
    + '<div class="row"><span>Gece sayısı</span><input type="text" id="sAtmN" inputmode="numeric" style="width:60px"><span>Son giriş (NY saati)</span><input type="time" id="sAtmCut" style="width:110px"></div>'
    + '<div class="row"><input type="checkbox" id="sAtmWide"><span>Geniş stop: sweep ucunun ötesi. Kapalıyken stop retest mumunun ucunda (videodaki dar stop).</span></div>'
    + '<div class="note">Range 18:00–19:00 New York (Üsküp 00:00–01:00). Seviyenin dışında gövde kapanışı = sweep → içeride kapanış = geri alma → seviyeye değip içeride kapanan mumda giriş → hedef range\'in karşı ucu. 1 dk veriyle hesaplanır; US100\'de 3 günden eski geceler 5 dk ile. Aynı mumda hem stop hem hedef varsa stop sayılır.</div>';
  row.parentNode.insertBefore(box, row);
  $('btnSet').addEventListener('click', () => { $('sAtmN').value = S.atmN; $('sAtmCut').value = S.atmCut; $('sAtmWide').checked = !!S.atmWide; });
  $('sSave').addEventListener('click', () => {
    const n = parseInt($('sAtmN').value, 10); S.atmN = Math.max(1, Math.min(10, n || 5));
    const c = String($('sAtmCut').value).trim(); if(/^\d{1,2}:\d{2}$/.test(c)) S.atmCut = c.padStart(5, '0');
    S.atmWide = $('sAtmWide').checked; saveS(); dirty = true;
  });
})();
(function(){ const d = document.createElement('div'); d.id = 'atmSr'; d.setAttribute('role', 'status'); d.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap'; document.body.appendChild(d); })();
buildTools(); dirty = true;
