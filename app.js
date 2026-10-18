const $ = id => document.getElementById(id);
const f = (x, d = 2) => x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
const kpiCard = (l, v, n = '') => `<div class="c"><div class="l">${l}</div><div class="v">${v}</div><div class="n">${n}</div></div>`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const REQUIRED = ['provider', 'product_name', 'country_name', 'data_gb', 'validity_days', 'price', 'network', 'top_up'];
const files = new Map(); // nom du fichier -> lignes

// Stockage local  : les fichiers restent dans ce navigateur jusqu'à suppression
const DB = (() => {
  let p;
  const open = () => p ||= new Promise((ok, ko) => {
    const r = indexedDB.open('esim-dashboard', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files', { keyPath: 'name' });
    r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error);
  });
  const run = (mode, fn) => open().then(db => new Promise((ok, ko) => {
    const t = db.transaction('files', mode), req = fn(t.objectStore('files'));
    t.oncomplete = () => ok(req && req.result); t.onerror = () => ko(t.error);
  })).catch(() => null); // si le stockage est indisponible (navigation privée), on continue sans
  return {
    all: () => run('readonly', s => s.getAll()), put: (name, rows) => run('readwrite', s => s.put({ name, rows })),
    del: name => run('readwrite', s => s.delete(name)), clear: () => run('readwrite', s => s.clear()),
  };
})();

function bars(id, rows, fmt) {
  const m = Math.max(...rows.map(r => r[1]));
  $(id).innerHTML = rows.map(r => `<div class="b"><span>${esc(r[0])}</span><i style="width:${r[1] / m * 100}%"></i><span>${fmt(r[1])}</span></div>`).join('');
}

function render() {
  const names = [...files.keys()];
  $('dash').hidden = !names.length; $('empty').hidden = names.length > 0; $('cnt').hidden = !names.length; $('cnt').textContent = names.length;
  const nbAdded = names.filter(n => ADDED_SET.has(n)).length;
  $('fl').innerHTML = (names.length ? '' : '<span class="n">Aucun fichier</span>')
    + names.map(n => {
        const removable = ADDED_SET.has(n);
        const tag = (EMBEDDED_SET.has(n) && !removable) ? '<small class="tg">embarqué</small>' : '';
        return `<span class="ch${removable ? '' : ' lock'}">${esc(n)}${tag}${removable ? `<button data-n="${esc(n)}" title="Retirer">✕</button>` : ''}</span>`;
      }).join('')
    + (names.length ? '<span class="n">📦 CSV embarqués (non supprimables) + vos fichiers ajoutés</span>' : '')
    + (nbAdded ? `<button class="rs" id="rs">Retirer mes ajouts (${nbAdded})</button>` : '');
  if (!names.length) { $('sub').textContent = 'Ajoutez vos fichiers CSV pour générer les statistiques.'; return; }
  const D = compute([...files.values()].flat());
  $('sub').textContent = `${D.nfiles} fournisseur${D.nfiles > 1 ? 's' : ''} · ${D.ncountries} pays/zones · ${names.length} fichier${names.length > 1 ? 's' : ''}`;
  $('kpi').innerHTML = kpiCard('Cartes eSIM', D.total.toLocaleString('fr-FR'), 'tous fournisseurs')
    + kpiCard('Produits > 100 €', D.over100, f(D.over100 / D.total * 100, 1) + ' % du catalogue')
    + kpiCard('Prix le plus bas', f(D.pmin) + ' €', esc(D.pmin_n)) + kpiCard('Prix le plus haut', f(D.pmax) + ' €', esc(D.pmax_n))
    + kpiCard('Data moyenne / carte', f(D.avg_gb) + ' Go', 'hors ' + D.unlimited + ' offres illimitées')
    + kpiCard('Prix moyen', f(D.avg_price) + ' €', 'médiane ' + f(D.median) + ' €');
  $('kpi2').innerHTML = kpiCard('Offres illimitées', D.unlimited, f(D.unlimited / D.total * 100, 1) + ' %')
    + kpiCard('Réseau 5G', f(D.pct5g, 1) + ' %') + kpiCard('Recharge possible', f(D.pct_topup, 1) + ' %', 'top-up « oui »')
    + kpiCard('Prix moyen / Go', f(D.avg_ppg) + ' €', 'offres non illimitées');
  bars('prov', D.prov.map(r => [r[0], r[1]]), x => x);
  bars('avg', [...D.prov].sort((a, b) => b[2] - a[2]).map(r => [r[0], r[2]]), f);
  bars('ppg', D.ppg, f); bars('ctry', D.ctry, x => x); bars('val', D.val.map(r => [r[0] + ' j', r[1]]), x => x);
  $('top').innerHTML = D.top.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td><b>${f(r[2])} €</b></td></tr>`).join('');
}

async function addFiles(list) {
  const errs = [];
  for (const file of list) {
    try {
      const text = typeof file.text === 'function' ? await file.text() : String(file.text || '');
      const rows = parseCSV(text);
      const miss = REQUIRED.filter(c => !rows.length || !(c in rows[0]));
      if (miss.length) errs.push(`${file.name} : colonne(s) manquante(s) ${miss.join(', ')}`);
      else { files.set(file.name, rows); ADDED_SET.add(file.name); await DB.put(file.name, rows); }
    } catch (e) { errs.push(`${file.name} : lecture impossible`); }
  }
  $('err').hidden = !errs.length; $('err').textContent = errs.join(' · ');
  if (errs.length) setDrawer(true);
  render();
}

$('inp').addEventListener('change', e => { addFiles([...e.target.files]); e.target.value = ''; });
['dragover', 'dragenter'].forEach(t => $('dz').addEventListener(t, e => { e.preventDefault(); $('dz').classList.add('over'); }));
['dragleave', 'drop'].forEach(t => $('dz').addEventListener(t, e => { e.preventDefault(); $('dz').classList.remove('over'); }));
const onlyCsv = e => [...e.dataTransfer.files].filter(x => /\.csv$/i.test(x.name));
$('dz').addEventListener('drop', e => addFiles(onlyCsv(e)));
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => { e.preventDefault(); if (e.target.closest && e.target.closest('#dz')) return; addFiles(onlyCsv(e)); setDrawer(true); });

// Panneau latéral (menu ☰)
function setDrawer(open) {
  $('side').classList.toggle('open', open); $('ov').hidden = !open;
  $('side').setAttribute('aria-hidden', !open); $('menu').setAttribute('aria-expanded', open);
}
$('menu').addEventListener('click', () => setDrawer(!$('side').classList.contains('open')));
$('open2').addEventListener('click', () => setDrawer(true));
$('close').addEventListener('click', () => setDrawer(false));
$('ov').addEventListener('click', () => setDrawer(false));
document.addEventListener('keydown', e => { if (e.key === 'Escape') setDrawer(false); });
const EMBEDDED_SET = new Set(); // noms des CSV embarqués (non supprimables)
const ADDED_SET = new Set();    // noms des CSV ajoutés par l'utilisateur (supprimables)
$('fl').addEventListener('click', async e => {
  const name = e.target.dataset.n;
  if (name) {
    if (!ADDED_SET.has(name)) return; // les CSV embarqués ne peuvent pas être retirés
    await DB.del(name);               // retire l'ajout de l'utilisateur
    return loadAll();                 // recharge l'état (un CSV embarqué de même nom réapparaît)
  }
  if (e.target.id === 'rs') { await DB.clear(); return loadAll(); }
});

// Au chargement : CSV embarqués + fichiers ajoutés par l'utilisateur
async function loadAll() {
  files.clear(); EMBEDDED_SET.clear(); ADDED_SET.clear();
  // 1) CSV embarqués dans le code (non supprimables)
  const embedded = (typeof window !== 'undefined' && Array.isArray(window.EMBEDDED_CSVS)) ? window.EMBEDDED_CSVS : [];
  for (const item of embedded) {
    try {
      const rows = parseCSV(item && item.text ? String(item.text) : '');
      const miss = REQUIRED.filter(c => !rows.length || !(c in rows[0]));
      if (!miss.length && item && item.name) { files.set(item.name, rows); EMBEDDED_SET.add(item.name); }
    } catch (e) { /* CSV embarqué invalide : ignoré */ }
  }
  // 2) Fichiers ajoutés par l'utilisateur (IndexedDB) - supprimables, primes sur les embarqués
  try {
    const list = await DB.all();
    (list || []).forEach(x => {
      if (x && x.name && Array.isArray(x.rows)) { files.set(x.name, x.rows); ADDED_SET.add(x.name); }
    });
  } catch (e) { /* ignore */ }
  // Tri par nom pour un affichage cohérent
  const sorted = new Map([...files.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  files.clear();
  sorted.forEach((v, k) => files.set(k, v));
  render();
}
loadAll();
