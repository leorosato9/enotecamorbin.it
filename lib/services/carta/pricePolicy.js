// lib/services/carta/pricePolicy.js
export function getPrice(meta = {}) {
  // prova più campi e pulisci stringhe tipo "€ 19,90"
  const keys = [
    'prezzo_num', 'prezzo', 'prezzo_euro', 'prezzoListino', 'prezzo_listino',
    'price', 'price_eur', 'prz', 'bottle_price'
  ];
  for (const k of keys) {
    if (meta[k] === 0 || meta[k]) {
      const raw = String(meta[k]).replace(/[€\s]/g, '').replace(',', '.');
      const n = Number(raw);
      if (Number.isFinite(n)) return n;
    }
  }
  return null; // sconosciuto
}

export function computePricePolicy({ fascia, cap = 250, minByFascia } = {}) {
  const f = Number(fascia) || 1;
  const defaultMin = { 1: 8, 2: 10, 3: 15, 4: 20, 5: 25 };
  const min = (minByFascia || defaultMin)[Math.max(1, Math.min(5, f))] || 10;
  return {
    max: cap,           // MAI oltre questo
    min,                // soglia consigliata
    minHardExclude: false, // se true: esclude <min; altrimenti penalizza
    unknownPenalty: 0.35   // punteggio usato quando il prezzo è sconosciuto
  };
}

export function priceScore(price, policy) {
  if (price == null) return policy.unknownPenalty; // sconosciuto → penalizza
  if (price > policy.max) return 0;                // hard cap
  if (price >= policy.min) return 1;               // ok
  // sotto-minimo: curva lineare verso 0.2
  const floor = Math.max(0, policy.min * 0.5);
  if (price <= floor) return 0.2;
  const ratio = (price - floor) / (policy.min - floor);
  return 0.2 + 0.8 * ratio;
}
