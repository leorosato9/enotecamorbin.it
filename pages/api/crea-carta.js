import { withAuth } from '../../lib/auth/withAuth';
import { ObjectId } from 'mongodb';

import { PLAN_CONFIG } from '../../lib/config/plans.js';

import { connectToDatabase } from '../../lib/mongodb'; 

import { checkRestaurantLimit } from '../../lib/services/limits/planLimiter.js';

import { parseForm } from '../../lib/services/carta/formParser.js';
import { extractAndValidateData } from '../../lib/services/carta/dataExtractor.js';
import { processMenuFile } from '../../lib/services/carta/textProcessor.js';
import { processPinecone } from '../../lib/services/carta/wineSelection.js';
import { generateWineExplanations } from '../../lib/services/carta/promptOpenAI.js';
import { supabaseUpload } from '../../lib/services/carta/supabaseUpload.js';
import { saveCartaToMongo } from '../../lib/services/carta/mongoUpload.js';
import { saveAttivita } from '../../lib/services/attivita/saveAttivita.js';

async function creaCartaHandler(req, res, session) {
  try {
    const userPlan = session.user.plan || 'free';
    const userId = session.user.id;
    const { db } = await connectToDatabase();
    
    const { fields, files } = await parseForm(req);
    const existingActivityId = fields.activityId ? (Array.isArray(fields.activityId) ? fields.activityId[0] : fields.activityId) : null;

    let attivitaId;
    let attivitaData;

    if (!existingActivityId || existingActivityId === 'new') {
      console.log("Creazione nuova attività: eseguo il controllo dei limiti...");
      
      await checkRestaurantLimit(db, userId, userPlan);
      
      console.log("Controllo superato. Procedo con la creazione.");
      attivitaData = extractAndValidateData({ fields, files });
      attivitaId = await saveAttivita({ userId, userEmail: session.user.email, ...attivitaData });
      
    } else {
      console.log(`Utilizzo attività esistente: ${existingActivityId}. Salto il controllo.`);
      attivitaId = existingActivityId;
      const loadedActivity = await db.collection('attività').findOne({ 
        _id: new ObjectId(attivitaId), 
        userId: userId 
      });

      if (!loadedActivity) {
        return res.status(404).json({ success: false, message: "Attività non trovata o non autorizzata." });
      }
      
      attivitaData = {
        nome: loadedActivity.nome,
        regione: loadedActivity.regione,
        provincia: loadedActivity.provincia,
        comune: loadedActivity.comune,
        fascia: loadedActivity.fascia,
      };
    }

    const { filePath, fileType } = extractAndValidateData({ fields, files });
    const { text: menuText, embedding: menuEmbedding } = await processMenuFile({ filePath, fileType });
    const { elencoBottiglie, topSelections } = await processPinecone({ menuEmbedding, selectK: 12 });
    const spiegazioniJson = await generateWineExplanations({ ...attivitaData, menuText, elencoBottiglie });
    const publicUrl = await supabaseUpload(filePath, files.file[0].mimetype);

    const cartaId = await saveCartaToMongo({
      userId: userId,
      userEmail: session.user.email,
      attivitaId: attivitaId,
      ...attivitaData,
      risultati: topSelections,
      spiegazioniJson,
      fileUrl: publicUrl,
      menuText,
      menuEmbedding,
      userPlan
    });

    return res.status(201).json({ success: true, id: cartaId, fileUrl: publicUrl });

  } catch (err) {
    if (err.statusCode === 403) {
      console.log('Limite raggiunto, invio risposta "soft error" al client.');
      return res.status(200).json({ success: false, message: err.message });
    }
    
    console.error('[crea-carta] Errore:', err.message);
    return res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Errore interno del server' });
  }
}

export default withAuth(async (req, res, session) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
  } else {
    await creaCartaHandler(req, res, session);
  }
});
