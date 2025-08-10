// lib/services/carta/distribution.js
/**
 * Calcola quanti vini per famiglia in base ai piatti del menù.
 * Famiglie supportate: bollicine, bianchi, rosati, rossi.
 * Setta allowDolci=true solo se hai vini dessert nel DB.
 */
export function computeWineDistribution(dishes, total = 12, opts = {}) {
  const { allowDolci = false } = opts;

  const fam = { bollicine: 0, bianchi: 0, rosati: 0, rossi: 0 };
  let dolciScore = 0; // conteggio solo informativo

  for (const d of dishes || []) {
    // family
    if (d.family === 'pesce') { fam.bollicine += 1; fam.bianchi += 2; }
    if (d.family === 'vegetariano') { fam.bianchi += 1; fam.rosati += 0.5; }
    if (d.family === 'carne_bianca') { fam.bianchi += 1; fam.rossi += 1; }
    if (d.family === 'carne_rossa') { fam.rossi += 2; }
    if (d.family === 'formaggi') { fam.rossi += 1; fam.bianchi += 0.5; }

    // tecniche/condimenti
    if (d.technique === 'fritto') fam.bollicine += 1;
    if (d.spice === 'media' || d.spice === 'alta') fam.rosati += 1;

    // dessert (solo se abilitato)
    if (d.course === 'dolce') dolciScore += 1;
  }

  // Se permettessimo i dolci, li mapperemmo qui:
  // if (allowDolci && dolciScore > 0) fam.dolci = dolciScore;

  // Minimi ragionevoli sulle 4 famiglie supportate
  const min = { bollicine: 1, bianchi: 3, rosati: 1, rossi: 3 };

  // normalizza
  const sum = Object.values(fam).reduce((a, b) => a + b, 0) || 1;
  const proporzioni = Object.fromEntries(Object.entries(fam).map(([k, v]) => [k, v / sum]));

  // iniziale arrotondato
  let dist = Object.fromEntries(Object.entries(proporzioni).map(([k, p]) => [k, Math.round(p * total)]));

  // applica minimi
  for (const k of Object.keys(min)) dist[k] = Math.max(min[k], dist[k]);

  // aggiusta per far tornare il totale
  let delta = total - Object.values(dist).reduce((a, b) => a + b, 0);
  while (delta !== 0) {
    // se dobbiamo aggiungere: boost alla famiglia più “richiesta” dal menù
    // se togliere: riduci dalla famiglia più alta
    const target = delta > 0
      ? Object.entries(fam).sort((a, b) => b[1] - a[1])[0][0]
      : Object.entries(dist).sort((a, b) => b[1] - a[1])[0][0];
    dist[target] += delta > 0 ? 1 : -1;
    delta = total - Object.values(dist).reduce((a, b) => a + b, 0);
  }

  return dist; // es. { bollicine:3, bianchi:5, rosati:1, rossi:3 }
}
