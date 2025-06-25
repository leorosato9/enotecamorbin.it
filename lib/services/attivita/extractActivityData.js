// lib/services/attivita/extractActivityData.js
export function extractActivityData(fields) {
  const getField = key => (
    Array.isArray(fields[key])
      ? fields[key][0].trim()
      : (fields[key] || '').trim()
  );

  const nome     = getField('nome');
  const regione  = getField('regione');
  const provincia= getField('provincia');
  const comune   = getField('comune');
  const fascia   = getField('fascia');

  if (![nome, regione, provincia, comune, fascia].every(v => v)) {
    throw new Error('Campi obbligatori per l’attività mancanti.');
  }

  return { nome, regione, provincia, comune, fascia };
}
