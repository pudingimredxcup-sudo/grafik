'use strict';
// ---------- Asya Sweep: arac cubugu dugmesi, ayarlar, cizim kancasi ----------
ICON.asw = '<rect x="3" y="7" width="8" height="10" fill="#00bcd4" fill-opacity=".3" stroke="#00bcd4" stroke-width="1.4"/><path d="M11 7H21M11 17H21" stroke="#00bcd4" stroke-width="1.4" stroke-dasharray="2 2"/><path d="M14 13l2.5 2.5L21 10" fill="none" stroke="currentColor" stroke-width="1.6"/>';
const aswBuildTools0 = buildTools;
buildTools = function(){
  aswBuildTools0();
  const nav = $('tools'), b = document.createElement('button');
  b.innerHTML = svg('asw') + '<span>Asya Sweep</span>'; if(S.asw) b.classList.add('on');
  b.onclick = () => { S.asw = !S.asw; saveS(); buildTools(); dirty = true; };
  nav.insertBefore(b, nav.querySelector('.sep'));
};
const aswRender0 = render;
render = function(){ aswRender0(); try{ aswDraw(); }catch(e){ console.error('ASW', e); } };
(function(){
  const row = $('sSave').parentNode, box = document.createElement('div');
  box.innerHTML = '<label>Asya Sweep (eski ATM: 00:00–01:00 sweep + retest)</label>'
    + '<div class="row"><span>Gece sayısı</span><input type="text" id="sAswN" inputmode="numeric" style="width:60px"><span>Son giriş (NY saati)</span><input type="time" id="sAswCut" style="width:110px"></div>'
    + '<div class="row"><input type="checkbox" id="sAswWide"><span>Geniş stop: sweep ucunun ötesi. Kapalıyken stop retest mumunun ucunda (videodaki dar stop).</span></div>'
    + '<div class="note">Range 18:00–19:00 New York (Üsküp 00:00–01:00). Seviyenin dışında gövde kapanışı = sweep → içeride kapanış = geri alma → seviyeye değip içeride kapanan mumda giriş → hedef range\'in karşı ucu. 1 dk veriyle hesaplanır; US100\'de 3 günden eski geceler 5 dk ile. Aynı mumda hem stop hem hedef varsa stop sayılır.</div>';
  row.parentNode.insertBefore(box, row);
  $('btnSet').addEventListener('click', () => { $('sAswN').value = S.aswN; $('sAswCut').value = S.aswCut; $('sAswWide').checked = !!S.aswWide; });
  $('sSave').addEventListener('click', () => {
    const n = parseInt($('sAswN').value, 10); S.aswN = Math.max(1, Math.min(10, n || 5));
    const c = String($('sAswCut').value).trim(); if(/^\d{1,2}:\d{2}$/.test(c)) S.aswCut = c.padStart(5, '0');
    S.aswWide = $('sAswWide').checked; saveS(); dirty = true;
  });
})();
(function(){ const d = document.createElement('div'); d.id = 'aswSr'; d.setAttribute('role', 'status'); d.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap'; document.body.appendChild(d); })();
buildTools(); dirty = true;
