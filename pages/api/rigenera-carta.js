// File: rigenera-carta.js
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
    selectedWines = [],
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
    // Vini da tenere
    const keptWines = risultati.filter(v => selectedWines.includes(v.id));
    // Vini da scartare
    const winesToDiscard = risultati.filter(v => !selectedWines.includes(v.id));
    // Spiegazioni da tenere
    const keptExplanations = [];
    risultati.forEach((vino, index) => {
      if (selectedWines.includes(vino.id) && spiegazioni[index]) {
        keptExplanations.push(spiegazioni[index]);
      }
    });

    const replacementsNeeded = winesToDiscard.length;
    console.log('[rigenera-carta] replacementsNeeded:', replacementsNeeded);

    if (replacementsNeeded === 0) {
      return res.status(200).json({
        success: true,
        risultati,
        spiegazioni,
        message: 'Nessun vino da sostituire.'
      });
    }

    // Trovo nuove selezioni e stringa dei nomi
    const { elencoBottiglie, topSelections } = await findCategorizedReplacements({
      menuEmbedding,
      selectedVectors: keptWines.map(v => v.values),
      winesToDiscard,
      allCurrentWines: risultati,
      replacementsNeeded
    });
    console.log('[rigenera-carta] elencoBottiglie count:', topSelections.length);

    if (!topSelections.length) {
      return res.status(404).json({
        success: false,
        message: 'Non sono stati trovati vini sostitutivi adeguati.'
      });
    }

    // Genera spiegazioni per le nuove bottiglie, usando la stringa elencoBottiglie
    const spiegazioniJson = await generateWineExplanations({
      nome: ristorante.nome,
      indirizzo: ristorante.indirizzo,
      menuText,
      elencoBottiglie
    });
    console.log('[rigenera-carta] raw spiegazioniJson:', spiegazioniJson);

    const parsed = JSON.parse(spiegazioniJson);
    const newExplanations = Array.isArray(parsed) ? parsed : parsed.explanations ?? [];

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
