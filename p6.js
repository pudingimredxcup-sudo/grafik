'use strict';
// ---------- toolbar ----------
const ICON = {
  cursor:'<path d="M5 3l6 16 2-7 7-2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  trend:'<path d="M4 19L20 5" stroke="currentColor" stroke-width="1.6"/><circle cx="4" cy="19" r="2" fill="currentColor"/><circle cx="20" cy="5" r="2" fill="currentColor"/>',
  ray:'<path d="M4 18L22 6" stroke="currentColor" stroke-width="1.6"/><circle cx="4" cy="18" r="2" fill="currentColor"/>',
  hline:'<path d="M2 12H22" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2" fill="currentColor"/>',
  rect:'<rect x="4" y="6" width="16" height="12" fill="currentColor" fill-opacity=".2" stroke="currentColor" stroke-width="1.6"/>',
  fib:'<path d="M3 5H21M3 9H21M3 12.5H21M3 16H21M3 19H21" stroke="currentColor" stroke-width="1.3"/>',
  pos:'<rect x="4" y="4" width="16" height="9" fill="#26a69a" fill-opacity=".5"/><rect x="4" y="13" width="16" height="6" fill="#ef5350" fill-opacity=".5"/><path d="M4 13H20" stroke="currentColor" stroke-width="1.4"/>',
  magnet:'<path d="M6 4v8a6 6 0 0012 0V4h-4v8a2 2 0 01-4 0V4z" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  del:'<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  clear:'<path d="M4 4l16 16M20 4L4 20" stroke="currentColor" stroke-width="1.6"/>',
};
const svg = k => `<svg viewBox="0 0 24 24">${ICON[k]}</svg>`;
function buildTools(){
  const nav = $('tools'); nav.innerHTML = '';
  const add = (key, text, on, fn, html) => { const b=document.createElement('button'); b.innerHTML=(html||svg(key))+`<span>${text}</span>`; if(on) b.classList.add('on'); b.onclick=fn; nav.appendChild(b); return b; };
  add('cursor','İmleç', mode==='cursor', ()=>setMode('cursor'));
  [['trend','Trend'],['ray','Işın'],['hline','Yatay'],['rect','Kutu'],['fib','Fib'],['pos','Pozisyon']].forEach(([k,t]) => add(k,t,mode===k,()=>setMode(mode===k?'cursor':k)));
  const s=document.createElement('div'); s.className='sep'; nav.appendChild(s);
  add('magnet','Mıknatıs', S.magnet, ()=>{ S.magnet=!S.magnet; saveS(); buildTools(); });
  const cur = (sel && drawings.find(d=>d.id===sel)) ? drawings.find(d=>d.id===sel).color : S.color;
  add(null,'Renk', false, ()=>{
    const i=(COLORS.indexOf(cur)+1)%COLORS.length; const nc=COLORS[i];
    const d = sel && drawings.find(z=>z.id===sel);
    if(d && d.type!=='pos'){ d.color=nc; saveDrawings(); } S.color=nc; saveS(); if(pending) pending.color=nc; buildTools(); dirty=true;
  }, `<span id="colorDot" style="background:${cur};margin:3px"></span>`);
  add('del','Sil', false, ()=>{ if(!sel) { setStatus('Önce silinecek çizime dokun.'); return; } drawings = drawings.filter(d=>d.id!==sel); sel=null; saveDrawings(); syncLock(); buildTools(); dirty=true; });
  add('clear','Temizle', false, ()=>{ if(!drawings.length) return; if(!confirm(S.sym+' üzerindeki tüm çizimler silinsin mi?')) return; drawings=[]; sel=null; saveDrawings(); syncLock(); buildTools(); dirty=true; });
}

// ---------- header + settings ----------
document.querySelectorAll('#syms button').forEach(b => b.onclick = () => { if(S.sym===b.dataset.sym) return; S.sym=b.dataset.sym; saveS(); load(); });
tfSel.onchange = () => { S.tf = tfSel.value; saveS(); load(); };
$('btnRefresh').onclick = () => load();
const modal = $('settings');
$('btnSet').onclick = () => {
  $('sOffX').value=S.off.XAUUSD||0; $('sOffN').value=S.off.US100||0; $('sE20').checked=S.ema20; $('sE50').checked=S.ema50;
  store.get('settings',{}); $('sStoreNote').textContent = storageOk ? 'Çizimler ve ayarlar bu tarayıcıda otomatik saklanıyor.' : 'Bu tarayıcı kalıcı kayda izin vermiyor: sayfa kapanınca çizimler gider. Yedeği kopyalayıp saklayabilirsin.';
  modal.classList.remove('hidden');
};
$('sClose').onclick = () => modal.classList.add('hidden');
modal.onclick = e => { if(e.target===modal) modal.classList.add('hidden'); };
$('sSave').onclick = () => {
  const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };
  const nx = num($('sOffX').value), nn = num($('sOffN').value);
  const offChanged = nx !== (+S.off.XAUUSD||0) || nn !== (+S.off.US100||0);
  S.off = {XAUUSD:nx, US100:nn}; S.ema20=$('sE20').checked; S.ema50=$('sE50').checked; saveS();
  modal.classList.add('hidden'); if(offChanged) load(); else { applyEMAs(); dirty=true; }
};
$('sExport').onclick = () => { $('sBackup').value = JSON.stringify({XAUUSD: store.get('draw_XAUUSD',[]), US100: store.get('draw_US100',[])}); };
$('sCopy').onclick = async () => { if(!$('sBackup').value) $('sExport').onclick(); try{ await navigator.clipboard.writeText($('sBackup').value); $('sStoreNote').textContent='Kopyalandı.'; }catch(e){ $('sBackup').select(); $('sStoreNote').textContent='Otomatik kopyalanamadı: metni seçip elle kopyala.'; } };
$('sImport').onclick = () => {
  try{ const o = JSON.parse($('sBackup').value); ['XAUUSD','US100'].forEach(k => { if(Array.isArray(o[k])) store.set('draw_'+k, o[k]); }); drawings = store.get('draw_'+S.sym, []); sel=null; syncLock(); dirty=true; $('sStoreNote').textContent='İçe aktarıldı.'; }
  catch(e){ $('sStoreNote').textContent='Geçersiz yedek metni.'; }
};

buildTools();
load();
window.__gx = { get drawings(){return drawings;}, get bars(){return bars;}, chart, series };
