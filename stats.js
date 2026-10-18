// Lecture des CSV et calcul des statistiques (aucun chiffre n'est pré-calculé)
function parseCSV(text) {
  text = text.replace(/^\uFEFF/, "");
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); cur = ""; if (row.length > 1 || row[0] !== "") rows.push(row); row = []; }
    else cur += c;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  const h = rows.shift();
  return rows.map(r => Object.fromEntries(h.map((k, i) => [k.trim(), (r[i] ?? "").trim()])));
}
const sum = a => a.reduce((s, x) => s + x, 0), mean = a => sum(a) / a.length;
const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const r2 = x => Math.round(x * 100) / 100, r1 = x => Math.round(x * 10) / 10;
const count = (a, k) => a.reduce((m, x) => (m.set(x[k], (m.get(x[k]) || 0) + 1), m), new Map());

function compute(rows) {
  rows = rows.map(r => ({ ...r, price: parseFloat(r.price), gb: r.data_gb === "" ? null : parseFloat(r.data_gb), days: parseInt(r.validity_days) }));
  const lim = rows.filter(r => r.gb !== null), prices = rows.map(r => r.price);
  const lo = rows.reduce((a, b) => (b.price < a.price ? b : a)), hi = rows.reduce((a, b) => (b.price > a.price ? b : a));
  const byProv = {}; rows.forEach(r => (byProv[r.provider] ||= []).push(r));
  const ppgByProv = {}; lim.forEach(r => (ppgByProv[r.provider] ||= []).push(r.price / r.gb));
  const label = r => `${r.provider} · ${r.product_name}`;
  return {
    total: rows.length, nfiles: Object.keys(byProv).length, over100: rows.filter(r => r.price > 100).length,
    pmin: r2(lo.price), pmin_n: label(lo), pmax: r2(hi.price), pmax_n: label(hi),
    avg_gb: r2(mean(lim.map(r => r.gb))), avg_price: r2(mean(prices)), median: r2(median(prices)),
    unlimited: rows.length - lim.length, pct5g: r1(rows.filter(r => r.network === "5G").length / rows.length * 100),
    pct_topup: r1(rows.filter(r => r.top_up === "oui").length / rows.length * 100),
    ncountries: new Set(rows.map(r => r.country_name)).size, avg_ppg: r2(mean(lim.map(r => r.price / r.gb))),
    prov: Object.entries(byProv).map(([k, v]) => [k, v.length, r2(mean(v.map(x => x.price)))]).sort((a, b) => b[1] - a[1]),
    ppg: Object.entries(ppgByProv).map(([k, v]) => [k, r2(median(v))]).sort((a, b) => a[1] - b[1]),
    ctry: [...count(rows, "country_name")].sort((a, b) => b[1] - a[1]).slice(0, 8),
    val: [...count(rows.map(r => ({ d: r.days })), "d")].sort((a, b) => a[0] - b[0]),
    top: [...rows].sort((a, b) => b.price - a.price).slice(0, 5).map(r => [r.provider, r.product_name, r.price]),
  };
}
if (typeof module !== "undefined") module.exports = { parseCSV, compute };
