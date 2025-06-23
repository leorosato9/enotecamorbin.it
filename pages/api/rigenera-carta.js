import { withAuth } from '../../lib/auth/withAuth';

import { connectToDatabase } from '../../lib/mongodb';

import { findCategorizedReplacements } from '../../lib/services/carta/wineSelection.js';
import { generateWineExplanations } from '../../lib/services/carta/promptOpenAI.js';
import { updateCartaInMongo } from '../../lib/services/carta/mongoUpload.js';

async function rigeneraCartaHandler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { cartaId, risultati, selectedWines, menuEmbedding, menuText, ristorante, spiegazioni } = req.body;

    const { db } = await connectToDatabase();
    const carta = await db.collection('cartavini').findOne({ _id: cartaId });

    if (!carta) {
        return res.status(404).json({ success: false, message: 'Carta non trovata.' });
    }

    if (carta.regenerationCount >= carta.regenerationLimit) {
        const message = `Hai raggiunto il limite di ${carta.regenerationLimit} rigenerazioni per questa carta.`;
        console.log(`[rigenera-carta] Limite raggiunto per ${cartaId}: ${message}`);
        return res.status(403).json({ success: false, message: message });
    }
    
    if (!menuEmbedding || menuEmbedding.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dati del menù (embedding) non trovati. Impossibile rigenerare.' 
      });
    }

    const winesToKeep = risultati.filter(v => selectedWines.includes(v.id));
    const winesToDiscard = risultati.filter(v => !selectedWines.includes(v.id));
    const replacementsNeeded = winesToDiscard.length;

    if (replacementsNeeded === 0) {
      return res.status(200).json({
        success: true,
        risultati: risultati,
        spiegazioni: spiegazioni,
        message: 'Nessun vino da rigenerare.'
      });
    }
    
    console.log(`Rigenerazione richiesta. Vini da tenere: ${winesToKeep.length}, Vini da sostituire: ${winesToDiscard.length}`);

    const { topSelections: newWines } = await findCategorizedReplacements({
      menuEmbedding,
      selectedVectors: winesToKeep.map(v => v.values),
      winesToDiscard,
      allCurrentWines: risultati,
      replacementsNeeded
    });
    
    if (newWines.length === 0) {
        return res.status(404).json({ success: false, message: 'Non sono stati trovati vini sostitutivi adeguati.' });
    }

    const elencoBottiglie = newWines.map(vino => {
      const nomeVino = vino.metadata.nomeVino || vino.metadata.nome_completo || 'Nome non disponibile';
      return `- ${vino.metadata.produttore || ''} – ${vino.metadata.denominazione || nomeVino} ${vino.metadata.annata || ''}`;
    }).join('\n');

    const spiegazioniJson = await generateWineExplanations({ ...ristorante, menuText, elencoBottiglie });
    const newExplanations = JSON.parse(spiegazioniJson);
    
    const keptExplanations = spiegazioni.filter((_, index) => selectedWines.includes(risultati[index].id));
    
    const finalRisultati = [...winesToKeep, ...newWines];
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