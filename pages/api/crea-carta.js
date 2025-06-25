import { withAuth } from '../../lib/auth/withAuth';
import { connectToDatabase } from '../../lib/mongodb';
import { parseForm } from '../../lib/services/carta/formParser';
import { extractAndValidateData } from '../../lib/services/carta/dataExtractor';
import { checkRestaurantLimit } from '../../lib/services/limits/planLimiter';
import { saveAttivita } from '../../lib/services/attivita/saveAttivita';
import { processMenuFile } from '../../lib/services/carta/textProcessor';
import { processPinecone } from '../../lib/services/carta/wineSelection';
import { generateWineExplanations } from '../../lib/services/carta/promptOpenAI';
import { supabaseUpload } from '../../lib/services/carta/supabaseUpload';
import { saveCartaToMongo } from '../../lib/services/carta/mongoUpload'; // Useremo la funzione di salvataggio singola
import { ObjectId } from 'mongodb'; 

export const config = {
  api: { bodyParser: false }
};

async function handler(req, res, session) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  try {
    const userId   = session.user.id;
    const userPlan = session.user.plan || 'free';
    const { db }   = await connectToDatabase();

    // 1. Parsing del form e validazione dei dati
    const { fields, files } = await parseForm(req);
    const { nome, regione, provincia, comune, fascia, filePath, fileType } = extractAndValidateData({ fields, files });
    
    // 2. Gestione Attività (nuova o esistente)
    let activityId;
    const isNewActivity = !fields.activityId || fields.activityId[0] === 'new';

    if (isNewActivity) {
      await checkRestaurantLimit(db, userId, userPlan);
      activityId = await saveAttivita({ userId, userEmail: session.user.email, nome, regione, provincia, comune, fascia });
    } else {
      activityId = fields.activityId[0];
    }

    // 3. ESECUZIONE DI TUTTO IL PROCESSO IN MODO SINCRONO
    const { text: menuText, embedding: menuEmbedding } = await processMenuFile({ filePath, fileType });
    const { elencoBottiglie, topSelections } = await processPinecone({ menuEmbedding, selectK: 12 });
    const spiegazioniJson = await generateWineExplanations({ nome, regione, provincia, comune, fascia, menuText, elencoBottiglie });
    const publicUrl = await supabaseUpload(filePath, files.file[0].mimetype);
    
    const cartaId = await saveCartaToMongo({
      userId,
      userEmail: session.user.email,
      attivitaId: activityId,
      nomeLocale: nome,
      regione,
      provincia,
      comune,
      fascia,
      risultati: topSelections,
      spiegazioniJson,
      fileUrl: publicUrl,
      menuText,
      menuEmbedding,
      userPlan
    });

    // 4. Risposta al frontend solo DOPO che tutto è stato completato
    return res.status(201).json({ success: true, id: cartaId });

  } catch (error) {
    console.error('[crea-carta] Errore:', error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
}

export default withAuth(handler);