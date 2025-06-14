import { withAuth } from '../../lib/auth/withAuth';
// Assicurati di importare entrambi i servizi di ricerca
import { findCategorizedReplacements, processPinecone } from '../../lib/services/carta/wineSelection.js';
import { generateWineExplanations } from '../../lib/services/carta/promptOpenAI.js';
import { updateCartaInMongo } from '../../lib/services/carta/mongoUpload.js';

async function rigeneraCartaHandler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { cartaId, risultati, selectedWines, menuEmbedding, menuText, ristorante, spiegazioni } = req.body;
    let newWines = [];

    if (!menuEmbedding || menuEmbedding.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dati del menù (embedding) non trovati. Impossibile rigenerare. Prova a creare una nuova carta.' 
      });
    }
    
    if (selectedWines && selectedWines.length > 0) {
      console.log("Eseguo rigenerazione con preferenze...");
      const keptWines = risultati.filter(v => selectedWines.includes(v.id));
      const selectedVectors = keptWines.map(v => v.values);

      const { topSelections } = await findCategorizedReplacements({
        menuEmbedding,
        selectedVectors,
        allCurrentWines: risultati,
        keptWineIds: selectedWines
      });
      newWines = topSelections;

    } else {
      console.log("Eseguo rigenerazione completa senza preferenze...");
      const excludedIds = risultati.map(vino => vino.id);
      const { topSelections } = await processPinecone({
        menuEmbedding,
        selectK: risultati.length,
        excludedIds: excludedIds
      });
      newWines = topSelections;
    }

    if (newWines.length === 0) {
      return res.status(404).json({ success: false, message: 'Non sono stati trovati vini sostitutivi adeguati.' });
    }

    const elencoBottiglie = newWines.map(vino => {
      const nomeVino = vino.metadata.nomeVino || vino.metadata.nome_completo || 'Nome non disponibile';
      return `- ${vino.metadata.produttore || ''} – ${vino.metadata.denominazione || nomeVino} ${vino.metadata.annata || ''}`;
    }).join('\n');
    const spiegazioniJson = await generateWineExplanations({ ...ristorante, menuText, elencoBottiglie });
    const newExplanations = JSON.parse(spiegazioniJson);
    
    const keptWines = risultati.filter(v => selectedWines.includes(v.id));
    const keptExplanations = spiegazioni.filter((_, index) => selectedWines.includes(risultati[index].id));
    const finalRisultati = [...keptWines, ...newWines];
    const finalSpiegazioni = [...keptExplanations, ...newExplanations];

    await updateCartaInMongo({
      cartaId: cartaId,
      updatedRisultati: finalRisultati,
      updatedSpiegazioni: finalSpiegazioni
    });

    return res.status(200).json({
      success: true,
      risultati: finalRisultati,
      spiegazioni: finalSpiegazioni,
    });

  } catch (err) {
    console.error('[rigenera-carta] Errore:', err);
    return res.status(500).json({ success: false, message: 'Errore interno del server.' });
  }
}

export default withAuth(rigeneraCartaHandler);