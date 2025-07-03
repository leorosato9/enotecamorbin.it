// pages/api/rigenera-carta.js
import { withAuth } from '../../lib/auth/withAuth';
import { findCategorizedReplacements } from '../../lib/services/carta/wineSelection.js';
import { generateWineExplanations }    from '../../lib/services/carta/promptOpenAI.js';
import { updateCartaInMongo }          from '../../lib/services/carta/mongoUpload.js';

async function rigeneraCartaHandler(req, res, session) {
  console.log('[rigenera-carta] START');
  if (req.method !== 'POST') {
    console.log('[rigenera-carta] Invalid method', req.method);
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
  }

  const { cartaId, risultati = [], selectedWines = [], menuEmbedding, menuText, ristorante, spiegazioni = [] } = req.body;
  console.log('[rigenera-carta] Received payload', { cartaId, total: risultati.length, selected: selectedWines.length });

  const kept    = risultati.filter(v => selectedWines.includes(v.id));
  const toRep   = risultati.filter(v => !selectedWines.includes(v.id));
  const keptExp = risultati.map((v, i) => selectedWines.includes(v.id) ? spiegazioni[i] : null).filter(x => x);
  console.log('[rigenera-carta] Kept wines:', kept.length, 'To replace:', toRep.length);

  if (!toRep.length) {
    console.log('[rigenera-carta] Nothing to replace, returning early');
    return res.status(200).json({ success: true, risultati, spiegazioni });
  }

  console.log('[rigenera-carta] Finding replacements...');
  const { topSelections } = await findCategorizedReplacements({
    menuEmbedding,
    selectedVectors: kept.map(v => v.values),
    winesToDiscard:  toRep,
    allCurrentWines: risultati,
    replacementsNeeded: toRep.length
  });
  console.log('[rigenera-carta] Replacements found:', topSelections.length);

  // Generate explanations in parallel
  console.log('[rigenera-carta] Generating explanations for each bottle concurrently...');
  const explanationPromises = topSelections.map(v => {
    const nomeVino     = v.metadata.nomeVino   || v.metadata.nome_completo || '';
    const produttore   = v.metadata.produttore || '';
    const denominazione= v.metadata.denominazione || nomeVino;
    const annata       = v.metadata.annata ? ` ${v.metadata.annata}` : '';
    const singleList   = `- ${produttore} – ${denominazione}${annata}`;
    console.log(`[rigenera-carta] Queue prompt for ${denominazione}`);
    return generateWineExplanations({
      nome:      ristorante.nome,
      regione:   ristorante.regione,
      provincia: ristorante.provincia,
      comune:    ristorante.comune,
      fascia:    ristorante.fascia,
      menuText,
      elencoBottiglie: singleList
    }).then(expl => {
      console.log(`[rigenera-carta] Explanation received for ${denominazione}, count:`, expl.length);
      return expl[0] || { name: `${produttore} – ${denominazione}`, bullets: [], explanation: [] };
    });
  });
  const newExplanations = await Promise.all(explanationPromises);
  console.log('[rigenera-carta] All explanations generated, count:', newExplanations.length);

  const finalResults = [...kept, ...topSelections];
  const finalSpieg   = [...keptExp, ...newExplanations];
  console.log('[rigenera-carta] Final arrays lengths', { wines: finalResults.length, explanations: finalSpieg.length });

  console.log('[rigenera-carta] Updating MongoDB...');
  await updateCartaInMongo({
    cartaId,
    updatedRisultati:    finalResults,
    updatedSpiegazioni: finalSpieg
  });
  console.log('[rigenera-carta] MongoDB update complete for', cartaId);

  return res.status(200).json({ success: true, risultati: finalResults, spiegazioni: finalSpieg });
}

export default withAuth(rigeneraCartaHandler);
