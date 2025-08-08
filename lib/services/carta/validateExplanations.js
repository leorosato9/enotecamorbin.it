// lib/services/carta/validateExplanation.js

/**
 * Controlla che l'oggetto explanation rispetti lo schema richiesto:
 * - name: string non vuota
 * - bullets: array di esattamente 6 stringhe
 * - explanation: array di esattamente 4 stringhe
 * @param {object} obj - Oggetto da validare
 * @returns {boolean} true se valido, false altrimenti
 */
export function isValidExplanation(obj) {
  if (!obj || typeof obj !== 'object') return false;

  const { name, bullets, explanation } = obj;

  // Verifica proprietà name
  if (typeof name !== 'string' || name.trim().length === 0) return false;

  // Verifica bullets: array di 6 stringhe
  if (!Array.isArray(bullets) || bullets.length !== 6) return false;
  for (const b of bullets) {
    if (typeof b !== 'string') return false;
  }

  // Verifica explanation: array di 4 stringhe
  if (!Array.isArray(explanation) || explanation.length !== 4) return false;
  for (const e of explanation) {
    if (typeof e !== 'string') return false;
  }

  return true;
}
