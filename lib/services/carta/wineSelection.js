// lib/services/carta/wineSelection.js
import { Pinecone } from '@pinecone-database/pinecone';
import { getPrice } from './pricePolicy';

/** Cosine sim robusta anche se le lunghezze differiscono di poco */
function cosineSimilarity(vecA, vecB) {
  const n = Math.min(vecA?.length || 0, vecB?.length || 0);
  if (!n) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < n; i++) {
    const a = vecA[i], b = vecB[i];
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/** MMR per diversificare set selezionato */
function selectDiverse(candidates, k = 1, lambda = 0.5) {
  const pool = [...candidates];
  if (pool.length === 0) return [];
  const selected = [];
  pool.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  selected.push(pool.shift());

  while (selected.length < k && pool.length > 0) {
    let bestIdx = -1, bestScore = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const relevance = pool[i].score ?? 0;
      let maxSim = 0;
      for (const sel of selected) {
        const sim = cosineSimilarity(pool[i].values || [], sel.values || []);
        if (sim > maxSim) maxSim = sim;
      }
      const mmr = lambda * relevance - (1 - lambda) * maxSim;
      if (mmr > bestScore) { bestScore = mmr; bestIdx = i; }
    }
    if (bestIdx >= 0) selected.push(pool.splice(bestIdx, 1)[0]);
    else break;
  }
  return selected;
}

/** Media vettori per “preference blending” */
function calculateAverageVector(vectors) {
  if (!vectors || vectors.length === 0) return [];
  const L = vectors[0].length;
  const avg = new Array(L).fill(0);
  for (const v of vectors) for (let i = 0; i < L; i++) avg[i] += v[i];
  for (let i = 0; i < L; i++) avg[i] /= vectors.length;
  return avg;
}

/** Canonical key per dedup: produttore + denominazione (case-insensitive) */
function canonicalWineKey(md = {}) {
  const prod = (md.produttore || md.cantina || '').toString().trim().toLowerCase();
  const denom = (md.denominazione || md.nomeVino || md.nome_completo || '').toString().trim().toLowerCase();
  return `${prod}||${denom}`;
}

/** Merge con dedup su id e su canonical key; mantiene il miglior punteggio */
function mergeUniqueMatches(acc, incoming) {
  const byId = new Map(acc.map(x => [x.id, x]));
  const byKey = new Map(acc.map(x => [canonicalWineKey(x.metadata), x]));

  for (const m of incoming) {
    const key = canonicalWineKey(m.metadata || {});
    const prevById = byId.get(m.id);
    const prevByKey = byKey.get(key);
    const prev = prevById || prevByKey;
    if (!prev) {
      acc.push(m);
      byId.set(m.id, m);
      byKey.set(key, m);
    } else {
      if ((m.score ?? 0) > (prev.score ?? 0)) {
        const idx = acc.findIndex(x => x.id === (prevById ? prevById.id : prev.id));
        if (idx >= 0) acc[idx] = m;
        byId.set(m.id, m);
        byKey.set(key, m);
      }
    }
  }
  return acc;
}

/** Util: verifica cap prezzo */
function withinCap(meta = {}, pricePolicy) {
  if (!pricePolicy?.max && pricePolicy?.max !== 0) return true;
  const pr = getPrice(meta);
  return pr == null || pr <= pricePolicy.max;
}

/**
 * PROCESSO POOL CANDIDATI
 * - Non impone struttura 3/3/3/3; prende un pool diversificato.
 * - Combina query generale + per-categoria.
 */
export async function processPinecone({
  menuEmbedding,
  selectK = 80,
  perCategoryTopK = 30,
  topKGlobal = 120,
  excludedIds = [],
  excludedKeys = [],
  namespace = undefined,
  pricePolicy
}) {
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = namespace ? pinecone.Index('vini-index').namespace(namespace)
                          : pinecone.Index('vini-index');

  // Query globale
  const globalResp = await index.query({
    vector: menuEmbedding,
    topK: topKGlobal,
    includeMetadata: true,
    includeValues: true,
  });

  let pool = (globalResp.matches || []).map(m => ({
    id: m.id, score: m.score, metadata: m.metadata || {}, values: m.values || [], categoria: (m.metadata?.categoria || '').toString()
  }));

  // Per-categoria
  const categoryDbMapping = {
    'Champagne': ['Champagne'],
    'Spumante': ['Spumante'],
    'Bianco': ['Bianco'],
    'Rosé': ['Rosé', 'Rosato', 'Rosé/rosato'],
    'Rosso': ['Rosso']
  };

  for (const values of Object.values(categoryDbMapping)) {
    const resp = await index.query({
      vector: menuEmbedding,
      topK: perCategoryTopK,
      includeMetadata: true,
      includeValues: true,
      filter: {
        categoria: { '$in': values }
      }
    });
    const matches = (resp.matches || []).map(m => ({
      id: m.id, score: m.score, metadata: m.metadata || {}, values: m.values || [], categoria: (m.metadata?.categoria || '').toString()
    }));
    pool = mergeUniqueMatches(pool, matches);
  }

  const idSet = new Set(excludedIds);
  const keySet = new Set(excludedKeys.map(x => x.toLowerCase()));
  let before = pool.length;
  pool = pool.filter(m =>
    !idSet.has(m.id) &&
    !keySet.has(canonicalWineKey(m.metadata || {})) &&
    withinCap(m.metadata, pricePolicy) // ✅ qui avviene il filtro prezzi
  );

  console.log('[wineSelection] cap filter ha tolto:', before - pool.length, 'su', before);

  const diversified = selectDiverse(pool, Math.min(selectK, pool.length), 0.5);

  const elencoBottiglie = diversified.map(v => {
    const md = v.metadata || {};
    const produttore = md.produttore || md.cantina || '';
    const denom = md.denominazione || md.nomeVino || md.nome_completo || 'Nome non disponibile';
    return `- ${produttore ? `${produttore} – ` : ''}${denom}`;
  }).join('\n');

return { elencoBottiglie, topSelections: diversified };


}export async function findCategorizedReplacements({
  menuEmbedding,
  selectedVectors,
  winesToDiscard,
  allCurrentWines,
  replacementsNeeded,
  excludedKeys = [],
  namespace = undefined,
  perCategoryTopK = 150,
  pricePolicy // opzionale: { max, ... }
}) {
  const preferenceVector = calculateAverageVector(selectedVectors);
  let finalSearchVector = [];
  if ((preferenceVector?.length || 0) > 0 && (menuEmbedding?.length || 0) > 0) {
    const wPref = 0.1, wMenu = 0.9;
    finalSearchVector = menuEmbedding.map((v, i) => (preferenceVector[i] * wPref) + (v * wMenu));
  } else {
    finalSearchVector = menuEmbedding;
  }
  if (!finalSearchVector?.length) return { topSelections: [] };

  const allCurrentIds = new Set(allCurrentWines.map(v => v.id));
  const toReplaceSet = new Set(winesToDiscard.map(v => v.id));
  const keySet = new Set(excludedKeys.map(x => x.toLowerCase()));

  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = namespace
    ? pinecone.Index('vini-index').namespace(namespace)
    : pinecone.Index('vini-index');

  // Quanti per categoria da sostituire
  const discardedCategoryCount = {};
  for (const v of winesToDiscard) {
    const category = v.categoria || (v.metadata?.categoria) || 'Sconosciuta';
    discardedCategoryCount[category] = (discardedCategoryCount[category] || 0) + 1;
  }

  let foundWines = [];

  // 1) Per ogni categoria persa, cerca sostituti
  for (const [category, count] of Object.entries(discardedCategoryCount)) {
    if (!count) continue;

    const resp = await index.query({
      vector: finalSearchVector,
      topK: perCategoryTopK,
      includeMetadata: true,
      includeValues: true,
      filter: { categoria: { '$eq': category } }
    });

    const matches = (resp.matches || []).map(m => ({
      id: m.id,
      score: m.score,
      metadata: m.metadata || {},
      values: m.values || [],
      categoria: (m.metadata?.categoria || '').toString()
    }));

    // Esclusioni: presenti, da scartare, key recenti, cap prezzo
  const safeMatches = matches.filter(m =>
    !allCurrentIds.has(m.id) &&
    !toReplaceSet.has(m.id) &&
    !keySet.has(canonicalWineKey(m.metadata || {})) &&
    withinCap(m.metadata, pricePolicy) // ✅ filtro prezzi qui
  );

    // Dedup per key (produttore+denominazione)
    const uniques = mergeUniqueMatches([], safeMatches);

    const categoryReplacements = selectDiverse(uniques, count, 0.5);
    foundWines.push(...categoryReplacements);
    for (const w of categoryReplacements) allCurrentIds.add(w.id);
  }

  // 2) Riempimento se sotto il fabbisogno
  const remainingNeeded = replacementsNeeded - foundWines.length;
  if (remainingNeeded > 0) {
    const resp = await index.query({
      vector: finalSearchVector,
      topK: perCategoryTopK,
      includeMetadata: true,
      includeValues: true
    });

    const matches = (resp.matches || []).map(m => ({
      id: m.id,
      score: m.score,
      metadata: m.metadata || {},
      values: m.values || [],
      categoria: (m.metadata?.categoria || '').toString()
    }));

    const safe = matches.filter(m =>
      !allCurrentIds.has(m.id) &&
      !toReplaceSet.has(m.id) &&
      !keySet.has(canonicalWineKey(m.metadata || {})) &&
      withinCap(m.metadata, pricePolicy)
    );

    const uniques = mergeUniqueMatches([], safe);
    const fillerWines = selectDiverse(uniques, remainingNeeded, 0.5);
    foundWines.push(...fillerWines);
  }

  return { topSelections: foundWines };
}
