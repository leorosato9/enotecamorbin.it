// utils/affinity.js

/**
 * Normalizza lo score Pinecone e lo mappa in un range [75, 98]
 * per ottenere percentuali meno gonfiate.
 */
export function inflateAffinity(rawScore, method = 'cosine') {
  let normalized;

  if (method === 'dotproduct') {
    // dot-product ∈ [-1,1] → normalized ∈ [0,1]
    normalized = (rawScore + 1) / 2;
  } else {
    // cosine distance ∈ [0,2] → similitudine ∈ [0,1]
    const cosineSim = 1 - Math.min(Math.max(rawScore, 0), 2) / 2;
    normalized = cosineSim;
  }

  // Clamp [0,1]
  normalized = Math.max(0, Math.min(normalized, 1));

  // Applicazione di sqrt per modesta leva sulla parte alta
  const boosted = Math.sqrt(normalized);

  // Mappatura lineare in [75, 98]
  const minPerc = 75;
  const maxPerc = 98;
  const scaled = minPerc + boosted * (maxPerc - minPerc);

  return Math.round(scaled);
}
