import { Pinecone } from '@pinecone-database/pinecone';

function cosineSimilarity(vecA, vecB) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function selectDiverse(candidates, k = 1, lambda = 0.0) {
  const pool = [...candidates];
  const selected = [];
  if (pool.length) selected.push(pool.shift());
  while (selected.length < k && pool.length > 0) {
    let bestIdx = -1, bestScore = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const relevance = pool[i].score;
      let maxSim = 0;
      for (const sel of selected) {
        const sim = cosineSimilarity(pool[i].values, sel.values);
        if (sim > maxSim) maxSim = sim;
      }
      const mmr = lambda * relevance - (1 - lambda) * maxSim;
      if (mmr > bestScore) {
        bestScore = mmr;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) selected.push(pool.splice(bestIdx, 1)[0]);
    else break;
  }
  return selected;
}

function calculateAverageVector(vectors) {
  if (!vectors || vectors.length === 0) return [];
  const vectorLength = vectors[0].length;
  const averageVector = new Array(vectorLength).fill(0);
  for (const vector of vectors) {
    for (let i = 0; i < vectorLength; i++) {
      averageVector[i] += vector[i];
    }
  }
  for (let i = 0; i < vectorLength; i++) {
    averageVector[i] /= vectors.length;
  }
  return averageVector;
}

export async function processPinecone({ menuEmbedding, queryK = 75, selectK = 6, lambda = 0.0, excludedIds = [] }) {
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pinecone.Index('vini-index');
  const resp = await index.query({
    vector: menuEmbedding,
    topK: queryK,
    includeMetadata: true,
    includeValues: true,
    ...(excludedIds && excludedIds.length > 0 && { filter: { id: { '$nin': excludedIds } } })
  });

  const matches = resp.matches.map(m => ({
    id: m.id,
    score: m.score,
    metadata: m.metadata,
    values: m.values,
    categoria: m.metadata.categoria || ''
  }));
  const topSelections = selectDiverse(matches, selectK, lambda);
  const elencoBottiglie = topSelections
    .map(vino => {
      const nomeVino = vino.metadata.nomeVino || vino.metadata.nome_completo || 'Nome non disponibile';
      const annata = vino.metadata.annata || '—';
      const denominazione = vino.metadata.denominazione || nomeVino;
      return (vino.metadata.produttore && denominazione)
        ? `- ${vino.metadata.produttore} – ${denominazione} ${annata}`
        : `- ${nomeVino} ${annata}`;
    })
    .join('\n');
  return { elencoBottiglie, topSelections };
}

export async function findCategorizedReplacements({ menuEmbedding, selectedVectors, allCurrentWines, keptWineIds }) {
  const preferenceVector = calculateAverageVector(selectedVectors);
  let finalSearchVector = [];
  if (preferenceVector.length > 0 && menuEmbedding && menuEmbedding.length > 0) {
    const weightPreference = 0.1;
    const weightMenu = 0.9;
    for (let i = 0; i < menuEmbedding.length; i++) {
      finalSearchVector[i] = (preferenceVector[i] * weightPreference) + (menuEmbedding[i] * weightMenu);
    }
  } else {
    finalSearchVector = preferenceVector.length > 0 ? preferenceVector : menuEmbedding;
  }

  if (!finalSearchVector || finalSearchVector.length === 0) {
    return { elencoBottiglie: '', topSelections: [] };
  }

  const discardedCategoryCount = {};
  const allCurrentIds = allCurrentWines.map(vino => vino.id);

  allCurrentWines.forEach(vino => {
    if (!keptWineIds.includes(vino.id)) {
      const category = vino.categoria || 'Sconosciuta';
      discardedCategoryCount[category] = (discardedCategoryCount[category] || 0) + 1;
    }
  });

  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pinecone.Index('vini-index');
  let newWines = [];

  for (const category in discardedCategoryCount) {
    const count = discardedCategoryCount[category];
    if (count === 0) continue;

    const resp = await index.query({
      vector: finalSearchVector,
      topK: 75,
      includeMetadata: true,
      includeValues: true,
      filter: {
        $and: [
          { categoria: { '$eq': category } },
          { id: { '$nin': allCurrentIds } }
        ]
      }
    });

    const matches = resp.matches.map(m => ({
      id: m.id,
      score: m.score,
      metadata: m.metadata,
      values: m.values,
      categoria: m.metadata.categoria || ''
    }));
    
    const categoryReplacements = selectDiverse(matches, count, 0.0);
    newWines.push(...categoryReplacements);
  }

  const elencoBottiglie = newWines.map(vino => {
      const nomeVino = vino.metadata.nomeVino || vino.metadata.nome_completo || 'Nome non disponibile';
      return `- ${vino.metadata.produttore || ''} – ${vino.metadata.denominazione || nomeVino} ${vino.metadata.annata || ''}`;
    }).join('\n');

  return { elencoBottiglie, topSelections: newWines };
}
