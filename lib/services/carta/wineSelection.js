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

function selectDiverse(candidates, k = 1, lambda = 0.5) {
  const pool = [...candidates];
  if (pool.length === 0) return [];
  
  const selected = [];
  pool.sort((a, b) => b.score - a.score);
  selected.push(pool.shift());

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
    if (bestIdx >= 0) {
      selected.push(pool.splice(bestIdx, 1)[0]);
    } else {
      break; 
    }
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

export async function processPinecone({ menuEmbedding, selectK = 12, lambda = 0.5, excludedIds = [] }) {
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pinecone.Index('vini-index');

  const idealStructure = { 'Bollicine': 3, 'Bianco': 3, 'Rosso': 3, 'Rosé': 3 };
  const categoryDbMapping = { 'Bollicine': ['Champagne', 'Spumante'], 'Bianco': ['Bianco'], 'Rosso': ['Rosso'], 'Rosé': ['Rosé'] };

  let allSelections = [];
  const exclusionSet = new Set(excludedIds);

  for (const category in idealStructure) {
    const numToSelect = idealStructure[category];
    if (numToSelect === 0) continue;

    console.log(`Cerco ${numToSelect} vini per la categoria concettuale: ${category}`);
    const dbCategories = categoryDbMapping[category];
    
    const resp = await index.query({
      vector: menuEmbedding,
      topK: 75,
      includeMetadata: true,
      includeValues: true,
      filter: {
        $and: [
          { categoria: { '$in': dbCategories } },
          ...(exclusionSet.size > 0 ? [{ id: { '$nin': Array.from(exclusionSet) } }] : [])
        ]
      }
    });

    const matches = resp.matches.map(m => ({ id: m.id, score: m.score, metadata: m.metadata, values: m.values, categoria: m.metadata.categoria || '' }));
    const categorySelections = selectDiverse(matches, numToSelect, lambda);
    allSelections.push(...categorySelections);
    categorySelections.forEach(wine => exclusionSet.add(wine.id));
  }
  
  const categoryOrder = ['Champagne', 'Spumante', 'Bianco', 'Rosé', 'Rosso'];
  allSelections.sort((a, b) => categoryOrder.indexOf(a.categoria) - categoryOrder.indexOf(b.categoria));
  
  const topSelections = allSelections;

  const elencoBottiglie = topSelections.map(vino => {
      const nomeVino = vino.metadata.nomeVino || vino.metadata.nome_completo || 'Nome non disponibile';
      return `- ${vino.metadata.produttore || ''} – ${vino.metadata.denominazione || nomeVino} ${vino.metadata.annata || ''}`;
    }).join('\n');

  return { elencoBottiglie, topSelections };
}


export async function findCategorizedReplacements({ menuEmbedding, selectedVectors, winesToDiscard, allCurrentWines, replacementsNeeded }) {
  const preferenceVector = calculateAverageVector(selectedVectors);
  let finalSearchVector = [];
  if (preferenceVector.length > 0 && menuEmbedding && menuEmbedding.length > 0) {
    const weightPreference = 0.1;
    const weightMenu = 0.9;
    for (let i = 0; i < menuEmbedding.length; i++) {
      finalSearchVector[i] = (preferenceVector[i] * weightPreference) + (menuEmbedding[i] * weightMenu);
    }
  } else {
    finalSearchVector = menuEmbedding;
  }

  if (!finalSearchVector || finalSearchVector.length === 0) {
    return { topSelections: [] };
  }

  const allCurrentIds = new Set(allCurrentWines.map(vino => vino.id));
  let foundWines = [];

  const discardedCategoryCount = {};
  winesToDiscard.forEach(vino => {
    const category = vino.categoria || 'Sconosciuta';
    discardedCategoryCount[category] = (discardedCategoryCount[category] || 0) + 1;
  });
  
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pinecone.Index('vini-index');

  for (const category in discardedCategoryCount) {
    const count = discardedCategoryCount[category];
    if (count === 0) continue;

    const resp = await index.query({
      vector: finalSearchVector,
      topK: 150,
      includeMetadata: true,
      includeValues: true,
      filter: {
        $and: [
          { categoria: { '$eq': category } },
          { id: { '$nin': Array.from(allCurrentIds) } }
        ]
      }
    });

    const matches = resp.matches.map(m => ({ id: m.id, score: m.score, metadata: m.metadata, values: m.values, categoria: m.metadata.categoria || '' }));
    
    const safeMatches = matches.filter(match => !allCurrentIds.has(match.id));

    const categoryReplacements = selectDiverse(safeMatches, count, 0.5); // Usiamo safeMatches
    foundWines.push(...categoryReplacements);
    categoryReplacements.forEach(wine => allCurrentIds.add(wine.id));
  }

  const remainingNeeded = replacementsNeeded - foundWines.length;
  if (remainingNeeded > 0) {
    console.log(`Ricerca mirata ha trovato ${foundWines.length} vini. Ne cerco altri ${remainingNeeded} in modo generico.`);
    
    const resp = await index.query({
        vector: finalSearchVector,
        topK: 150,
        includeMetadata: true,
        includeValues: true,
        filter: { id: { '$nin': Array.from(allCurrentIds) } }
    });

    const matches = resp.matches.map(m => ({ id: m.id, score: m.score, metadata: m.metadata, values: m.values, categoria: m.metadata.categoria || '' }));
    
    const safeFillerMatches = matches.filter(match => !allCurrentIds.has(match.id));

    const fillerWines = selectDiverse(safeFillerMatches, remainingNeeded, 0.5);
    foundWines.push(...fillerWines);
  }

  return { topSelections: foundWines };
}