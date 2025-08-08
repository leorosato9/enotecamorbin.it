import { withAuth } from '../../lib/auth/withAuth';
import { findCategorizedReplacements } from '../../lib/services/carta/wineSelection.js';
import { generateWineExplanations } from '../../lib/services/carta/promptOpenAI.js';
import { updateCartaInMongo } from '../../lib/services/carta/mongoUpload.js';

async function handler(req, res, session) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const {
    cartaId,
    risultati = [],
    selectedWines = [],
    menuEmbedding,
    menuText,
    ristorante,
    spiegazioni = []
  } = req.body;

  const kept = risultati.filter(v => selectedWines.includes(v.id));
  const toReplace = risultati.filter(v => !selectedWines.includes(v.id));
  const keptEx = risultati
    .map((v, i) => selectedWines.includes(v.id) ? spiegazioni[i] : null)
    .filter(x => x);

  if (!toReplace.length) {
    return res.status(200).json({ success: true, risultati, spiegazioni });
  }

  // Trova i sostituti
  const { topSelections } = await findCategorizedReplacements({
    menuEmbedding,
    selectedVectors: kept.map(v => v.values),
    winesToDiscard: toReplace,
    allCurrentWines: risultati,
    replacementsNeeded: toReplace.length
  });

  const elencoArray = topSelections.map((v, i) => {
    const nomeVino = v.metadata.nomeVino || v.metadata.nome_completo || '';
    const produttore = v.metadata.produttore || '';
    const denominazione = v.metadata.denominazione || nomeVino;
    const annata = v.metadata.annata ? ` ${v.metadata.annata}` : '';
    const line = `- ${produttore} – ${denominazione}${annata}`;

    const oldLabel = toReplace[i].metadata?.denominazione || toReplace[i].id;

    return line;
  });

  const newExplPromises = elencoArray.map((singleLine, idx) => {
    return generateWineExplanations({
      nome: ristorante.nome,
      regione: ristorante.regione,
      provincia: ristorante.provincia,
      comune: ristorante.comune,
      fascia: ristorante.fascia,
      menuText,
      elencoBottiglie: singleLine
    })
    .then(arr => arr[0] || {
      name: singleLine,
      bullets: Array(6).fill(''),
      explanation: Array(4).fill('')
    });
  });

  const nuove = await Promise.all(newExplPromises);

  // Ricomponi i risultati finali
  const finalRis = [...kept, ...topSelections];
  const finalEx = [...keptEx, ...nuove];

  await updateCartaInMongo({
    cartaId,
    updatedRisultati: finalRis,
    updatedSpiegazioni: finalEx
  });

  return res
    .status(200)
    .json({ success: true, risultati: finalRis, spiegazioni: finalEx });
}

export default withAuth(handler);
