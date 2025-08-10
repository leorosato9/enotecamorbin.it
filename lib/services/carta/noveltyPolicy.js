// lib/services/carta/noveltyPolicy.js

function canonicalKeyFromMeta(md = {}) {
  const prod = (md.produttore || md.cantina || '').toString().trim().toLowerCase();
  const denom = (md.denominazione || md.nomeVino || md.nome_completo || '').toString().trim().toLowerCase();
  return `${prod}||${denom}`;
}

export async function getRecentWineKeys(db, { attivitaId, lookbackCards = 3, cooldownDays = 30 }) {
  const since = new Date(Date.now() - cooldownDays * 864e5);
  const cursor = db.collection('cartavini') // la tua collection delle carte
    .find({ attivitaId, createdAt: { $gte: since } }, { projection: { risultati: 1, createdAt: 1 } })
    .sort({ createdAt: -1 })
    .limit(lookbackCards);

  const recentIds = new Set();
  const recentKeys = new Set();

  for await (const card of cursor) {
    for (const v of card.risultati || []) {
      recentIds.add(v.id);
      recentKeys.add(canonicalKeyFromMeta(v.metadata || {}));
    }
  }
  return { recentIds: Array.from(recentIds), recentKeys: Array.from(recentKeys), since };
}

export function enforceNovelty(selected, pool, { recentKeys = new Set(), minNoveltyRatio = 0.6 }) {
  const isRecent = (cand) => recentKeys.has(canonicalKeyFromMeta(cand.metadata || {}));

  const total = selected.length || 1;
  let novelty = selected.filter(c => !isRecent(c)).length;
  if (novelty / total >= minNoveltyRatio) return selected;

  // Prepara alternative dal pool che non siano già scelte e non siano recenti
  const selectedKeys = new Set(selected.map(c => canonicalKeyFromMeta(c.metadata || {})));
  const alternatives = pool
    .filter(c => !selectedKeys.has(canonicalKeyFromMeta(c.metadata || {})) && !isRecent(c))
    .sort((a, b) => (b._score ?? b.score ?? 0) - (a._score ?? a.score ?? 0));

  const out = [...selected];
  let altIdx = 0;

  for (let i = 0; i < out.length && altIdx < alternatives.length; i++) {
    if (novelty / total >= minNoveltyRatio) break;
    if (isRecent(out[i])) {
      out[i] = alternatives[altIdx++];
      novelty++;
    }
  }
  return out;
}
