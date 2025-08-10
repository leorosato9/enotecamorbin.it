// lib/services/carta/lintFacts.js

// se il testo contiene claim vietati non presenti nei facts → neutralizza
export function lintAndClampDescription(obj, facts = {}) {
  const join = (arr) => (Array.isArray(arr) ? arr.join(' ') : String(arr || ''));
  const text = `${obj.name} ${join(obj.bullets)} ${join(obj.explanation)}`.toLowerCase();

  const badYear = /\b(19\d{2}|20\d{2})\b/.test(text);          // annate
  const badPct = /\b\d{1,2}\s?%\b/.test(text);                 // percentuali
  const badDoc = /\bdocg?\b/.test(text);                       // doc/docg
  const badMethod = /(barrique|botti|charmat|classico)/.test(text); // metodi specifici

  const allowed = JSON.stringify(facts).toLowerCase();
  const has = (kw) => allowed.includes(kw);

  const flagged =
    (badYear && !/\byyyy\b/.test(allowed)) ||
    (badPct && !has('%')) ||
    (badDoc && !(has('doc') || has('docg'))) ||
    (badMethod && !(has('barrique') || has('botti') || has('charmat') || has('classico')));

  if (!flagged) return obj;

  // neutralizza solo i punti rischiosi
  const clamp = (s) =>
    s
      .replace(/\b(19\d{2}|20\d{2})\b/g, '')
      .replace(/\b\d{1,2}\s?%\b/g, '')
      .replace(/\bdocg?\b/gi, 'denominazione locale')
      .replace(/\b(barrique|botti|charmat|classico)\b/gi, 'affinamento tradizionale');

  return {
    name: obj.name,
    bullets: (obj.bullets || []).map(clamp),
    explanation: (obj.explanation || []).map(clamp),
  };
}
