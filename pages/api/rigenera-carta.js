// pages/api/rigenera-carta.js
import { withAuth } from '../../lib/auth/withAuth';

// Esistenti
import { findCategorizedReplacements } from '../../lib/services/carta/wineSelection.js'; // LOG
import { updateCartaInMongo } from '../../lib/services/carta/mongoUpload.js';              // LOG

// Nuovi
import { mapWineFamily } from '../../lib/services/carta/compatibility.js';                 // LOG
import { generateWineExplanationsGrounded } from '../../lib/services/carta/promptGrounded.js'; // LOG
import { lintAndClampDescription } from '../../lib/services/carta/lintFacts.js';           // LOG

const log = (...args) => console.log('[rigenera-carta]', ...args);
const time = (label) => {
  const start = Date.now();
  return () => log(`${label} finito in ${Date.now() - start}ms`);
};

async function handler(req, res, session) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    log('Avvio rigenera-carta per user:', session?.user?.email);

    const {
      cartaId,
      risultati = [],
      selectedWines = [],
      menuEmbedding,
      menuText,
      ristorante,
      spiegazioni = [],
      dishes = [] // opzionale
    } = req.body;

    log('Input:', {
      cartaId,
      risultati: risultati.length,
      locked: selectedWines.length,
      dishes: dishes?.length || 0
    });

    // split: kept vs toReplace
    const kept = risultati.filter(v => selectedWines.includes(v.id));
    const toReplace = risultati.filter(v => !selectedWines.includes(v.id));
    const keptEx = risultati
      .map((v, i) => selectedWines.includes(v.id) ? spiegazioni[i] : null)
      .filter(Boolean);

    log('Bloccati:', kept.length, 'Da sostituire:', toReplace.length);
    if (!toReplace.length) {
      log('Niente da sostituire. Ritorno i risultati originali.');
      return res.status(200).json({ success: true, risultati, spiegazioni });
    }

    // 1) Trova sostituti (retrieval)
    log('Chiamo file: lib/services/carta/wineSelection.js → findCategorizedReplacements()');
    const endFind = time('findCategorizedReplacements');
    const { topSelections } = await findCategorizedReplacements({
      menuEmbedding,
      selectedVectors: kept.map(v => v.values),
      winesToDiscard: toReplace,
      allCurrentWines: risultati,
      replacementsNeeded: toReplace.length
    });
    endFind();
    log('Ricevuti sostituti:', topSelections.length);

    // 2) Prepara facts per i nuovi
    const allowedDishNames = dishes?.slice(0, 12).map(d => d.name) || [];
    const wineFactsList = topSelections.map(v => {
      const md = v.metadata || {};
      const producer = md.produttore || md.cantina || '';
      const denom = md.denominazione || md.nomeVino || md.nome_completo || '';
      const grapes = md.uvaggio || md.vitigni || null;
      const region = md.regione || null;
      const country = md.paese || 'Italia';
      const family = mapWineFamily(md);
      return {
        name: producer ? `${producer} – ${denom}` : denom,
        facts: { producer, denomination: denom, grapes, region, country, family },
        allowedDishes: allowedDishNames
      };
    });

    // 3) Generazione descrizioni grounded
    log('Chiamo file: lib/services/carta/promptGrounded.js → generateWineExplanationsGrounded()');
    const endGen = time('generateWineExplanationsGrounded');
    const nuoveRaw = await generateWineExplanationsGrounded({
      context: {
        nome: ristorante.nome,
        regione: ristorante.regione,
        provincia: ristorante.provincia,
        comune: ristorante.comune,
        fascia: ristorante.fascia,
        menuText
      },
      wines: wineFactsList
    });
    endGen();
    log('Nuove descrizioni generate:', Array.isArray(nuoveRaw) ? nuoveRaw.length : 0);

    // 4) Linter anti-hallucination
    log('Chiamo file: lib/services/carta/lintFacts.js → lintAndClampDescription()');
    const endLint = time('lintAndClampDescription');
    const nuove = nuoveRaw.map((obj, i) =>
      lintAndClampDescription(obj, wineFactsList[i]?.facts)
    );
    endLint();

    // 5) Merge e salvataggio
    const finalRis = [...kept, ...topSelections];
    const finalEx = [...keptEx, ...nuove];

    log('Chiamo file: lib/services/carta/mongoUpload.js → updateCartaInMongo()');
    const endUpdate = time('updateCartaInMongo');
    await updateCartaInMongo({
      cartaId,
      updatedRisultati: finalRis,
      updatedSpiegazioni: finalEx
    });
    endUpdate();
    log('Carta aggiornata:', cartaId);

    return res.status(200).json({ success: true, risultati: finalRis, spiegazioni: finalEx });
  } catch (err) {
    console.error('[rigenera-carta][ERRORE]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

export default withAuth(handler);
