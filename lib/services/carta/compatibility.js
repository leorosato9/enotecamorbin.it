import { getPrice, priceScore } from './pricePolicy';
export function mapWineFamily(meta = {}) {
  const t = (s) => (s || '').toString().toLowerCase();
  const colore = t(meta.colore || meta.colour || meta.color);
  const tipologia = t(meta.tipologia || meta.tipology || meta.tipo);
  if (tipologia.includes('spumante') || tipologia.includes('bollic')) return 'bollicine';
  if (colore.includes('bianc')) return 'bianchi';
  if (colore.includes('rosat')) return 'rosati';
  if (colore.includes('ross')) return 'rossi';
  // fallback su denominazione
  const denom = t(meta.denominazione || meta.nomeVino || meta.nome_completo || '');
  if (/\b(franciacorta|prosecco|trentodoc|metodo classico|champagne)\b/.test(denom)) return 'bollicine';
  return 'bianchi';
}

// score 0..1 quanto il vino “copre” il piatto
export function scoreCompatibility(dish, meta = {}) {
  const fam = mapWineFamily(meta);
  let s = 0.5; // base
  if (dish.family === 'pesce') { if (fam === 'bianchi' || fam === 'bollicine') s += 0.3; if (fam === 'rossi') s -= 0.2; }
  if (dish.family === 'carne_bianca') { if (fam === 'bianchi' || fam === 'rossi') s += 0.2; }
  if (dish.family === 'carne_rossa') { if (fam === 'rossi') s += 0.35; else s -= 0.2; }
  if (dish.technique === 'fritto') { if (fam === 'bollicine') s += 0.25; }
  if (dish.spice === 'media' || dish.spice === 'alta') { if (fam === 'rosati' || fam === 'bianchi') s += 0.15; }
  s = Math.max(0, Math.min(1, s));
  return s;
}

// Rerank + pick per distribuzione
export function curateCandidates(candidates = [], dishes = [], distribution = {}, policy = { min: 0, max: 250, minHardExclude:false, unknownPenalty:0.35 }) {
  const validKeys = new Set(['bollicine', 'bianchi', 'rosati', 'rossi']);
  const byFamily = {};

  for (const c of candidates) {
    const fam = mapWineFamily(c.metadata);
    if (!validKeys.has(fam)) continue;

    const comp = dishes.length ? Math.max(...dishes.map(d => scoreCompatibility(d, c.metadata))) : 0.5;
    const rel  = c.score ?? 0.5;

    const price = getPrice(c.metadata);
    const pScore = priceScore(price, policy);

    // opzionale: escludi hard sotto-minimo
    if (policy.minHardExclude && price != null && price < policy.min) continue;
    // cap è già enforceato a monte, ma se dovesse sfuggire:
    if (price != null && price > policy.max) continue;

    // 🔧 Pesi aggiornati: diamo più voce al prezzo
    const overall = 0.5 * comp + 0.2 * rel + 0.3 * pScore;

    byFamily[fam] ||= [];
    byFamily[fam].push({ ...c, _compat: comp, _price: price, _pScore: pScore, _score: overall });
  }

  for (const fam of Object.keys(byFamily)) byFamily[fam].sort((a, b) => b._score - a._score);

  const needTotal = Object.entries(distribution)
    .filter(([k]) => validKeys.has(k))
    .reduce((a, [, v]) => a + v, 0);

  const out = [];
  for (const [fam, need] of Object.entries(distribution)) {
    if (!validKeys.has(fam)) continue;
    const pool = byFamily[fam] || [];
    for (let i = 0; i < need && i < pool.length; i++) out.push(pool[i]);
  }

  if (out.length < needTotal) {
    const leftovers = Object.values(byFamily).flat()
      .filter(x => !out.find(y => y.id === x.id));
    leftovers.sort((a, b) => b._score - a._score);
    while (out.length < needTotal && leftovers.length) out.push(leftovers.shift());
  }

  return out;
}