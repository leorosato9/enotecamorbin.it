// utils/affinity.js

/**
 * Dato uno score Pinecone in [-1,1] (dot-product) o in [0,2] (cosine distance),
 * lo normalizza su [0,1] e poi applica una radice quadrata per "gonfiarlo".
 * Restituisce un intero tra 0 e 100.
 */
export function inflateAffinity(rawScore, method = 'cosine') {
  let normalized;

  if (method === 'dotproduct') {
    // dot-product ∈ [-1,1] → normalized ∈ [0,1]
    normalized = (rawScore + 1) / 2;
  } else {
    // cosine distance ∈ [0,2] → prima lo riporto a similitudine ∈ [0,1]
    const cosineSim = 1 - Math.min(Math.max(rawScore, 0), 2) / 2;
    normalized = cosineSim;
  }

  // Assicuriamoci di rimanere in [0,1]
  normalized = Math.max(0, Math.min(normalized, 1));

  // Applichiamo sqrt per far lievitare la percentuale verso l’alto
  const boosted = Math.sqrt(normalized);

  return Math.round(boosted * 100);
}