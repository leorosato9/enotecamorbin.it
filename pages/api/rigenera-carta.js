import { withAuth } from '../../lib/auth/withAuth';
import { findCategorizedReplacements } from '../../lib/services/carta/wineSelection.js';
import { generateWineExplanations } from '../../lib/services/carta/promptOpenAI.js';
import { updateCartaInMongo } from '../../lib/services/carta/mongoUpload.js';

async function rigeneraCartaHandler(req, res, session) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
  }

  const {
    cartaId,
    risultati = [],
    selectedWines = [], // Questi ora sono gli ID dei vini da TENERE
    menuEmbedding,
    menuText,
    ristorante,
    spiegazioni = []
  } = req.body;

  if (!Array.isArray(menuEmbedding) || menuEmbedding.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Embedding del menù mancante. Rigenera la carta da zero.'
    });
  }

  try {
    // --- INIZIO LOGICA INVERTITA E CORRETTA ---

    // I vini da TENERE (keptWines) sono quelli i cui ID sono in `selectedWines`.
    const keptWines = risultati.filter(v => selectedWines.includes(v.id));

    // I vini da SCARTARE (winesToDiscard) sono tutti gli altri.
    const winesToDiscard = risultati.filter(v => !selectedWines.includes(v.id));

    // Le spiegazioni da TENERE sono quelle corrispondenti ai vini tenuti.
    const keptExplanations = [];
    risultati.forEach((vino, index) => {
      if (selectedWines.includes(vino.id)) {
        if (spiegazioni[index]) {
          keptExplanations.push(spiegazioni[index]);
        }
      }
    });

    const replacementsNeeded = winesToDiscard.length;
    // Se non ci sono vini da scartare (l'utente li ha selezionati tutti), non fare nulla.
    if (replacementsNeeded === 0) {
      return res.status(200).json({ 
        success: true, 
        risultati: risultati, 
        spiegazioni: spiegazioni,
        message: 'Nessun vino da sostituire.' 
      });
    }

    const { elencoBottiglie, topSelections } = await findCategorizedReplacements({
      menuEmbedding,
      selectedVectors: keptWines.map(v => v.values),
      winesToDiscard,
      allCurrentWines: risultati,
      replacementsNeeded
    });

    // --- FINE LOGICA INVERTITA ---

    if (!topSelections || !topSelections.length) {
      return res.status(404).json({
        success: false,
        message: 'Non sono stati trovati vini sostitutivi adeguati.'
      });
    }

    const spiegazioniJson = await generateWineExplanations({
      ...ristorante,
      menuText,
      elencoBottiglie
    });
    const newExplanations = JSON.parse(spiegazioniJson);

    const finalResults = [...keptWines, ...topSelections];
    const finalSpiegazioni = [...keptExplanations, ...newExplanations];

    await updateCartaInMongo({
      cartaId,
      updatedRisultati: finalResults,
      updatedSpiegazioni: finalSpiegazioni
    });

    return res.status(200).json({
      success: true,
      risultati: finalResults,
      spiegazioni: finalSpiegazioni
    });

  } catch (err) {
    console.error('[rigenera-carta] Errore:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Errore interno del server.'
    });
  }
}

export default withAuth(rigeneraCartaHandler);