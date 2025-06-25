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
import { saveCartaToMongo } from '../../lib/services/carta/mongoUpload';
import { ObjectId } from 'mongodb'; 

export const config = {
  api: { bodyParser: false }
};

async function handler(req, res, session) {
  console.log('[crea-carta] ▶️ Inizio esecuzione API.');
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  try {
    const userId   = session.user.id;
    const userPlan = session.user.plan || 'free';
    const { db }   = await connectToDatabase();

    const { fields, files } = await parseForm(req);
    
    // --- LOG DI DEBUG 1: Contenuto del form ---
    console.log('[crea-carta] Dati ricevuti dal form:', JSON.stringify(fields, null, 2));
    
    const upload = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!upload || !upload.filepath) {
      throw new Error('File del menù mancante.');
    }
    const { filepath: filePath, mimetype: fileType } = upload;

    let activityData;
    let activityId;
    
    const activityIdFromForm = fields.activityId?.[0];
    const isNewActivity = !activityIdFromForm || activityIdFromForm === 'new';

    // --- LOG DI DEBUG 2: Decisione sul tipo di attività ---
    console.log(`[crea-carta] Controllo attività: activityId ricevuto='${activityIdFromForm}', isNewActivity=${isNewActivity}`);

    if (isNewActivity) {
      console.log('[crea-carta] Flusso: Creazione NUOVA attività.');
      await checkRestaurantLimit(db, userId, userPlan);
      
      const validatedData = extractAndValidateData({ fields, files });
      activityData = {
        nome: validatedData.nome,
        regione: validatedData.regione,
        provincia: validatedData.provincia,
        comune: validatedData.comune,
        fascia: validatedData.fascia
      };
      activityId = await saveAttivita({ userId, userEmail: session.user.email, ...activityData });
      console.log(`[crea-carta] Nuova attività creata con ID: ${activityId}`);

    } else {
      console.log(`[crea-carta] Flusso: Uso attività ESISTENTE con ID: ${activityIdFromForm}`);
      activityId = activityIdFromForm;
      const found = await db.collection('attività').findOne({ _id: new ObjectId(activityId), userId });
      if (!found) {
        console.error(`[crea-carta] Errore: Attività con ID ${activityId} non trovata per l'utente ${userId}`);
        return res.status(404).json({ success: false, message: 'Attività non valida o non appartenente a questo utente.' });
      }
      activityData = found;
      console.log(`[crea-carta] Attività esistente trovata: ${activityData.nome}`);
    }

    // --- LOG DI DEBUG 3: Verifica finale prima della generazione ---
    console.log(`[crea-carta] Pronto per la generazione. activityId finale: ${activityId}`);
    if(!activityId) {
      throw new Error("ERRORE CRITICO: activityId non è definito prima della generazione.");
    }
    
    const publicUrl = await supabaseUpload(filePath, fileType);
    console.log('[crea-carta] File caricato su Supabase.');

    const { text: menuText, embedding: menuEmbedding } = await processMenuFile({ filePath, fileType });
    console.log('[crea-carta] Testo ed embedding estratti dal menù.');

    const { elencoBottiglie, topSelections } = await processPinecone({ menuEmbedding, selectK: 12 });
    console.log('[crea-carta] Vini selezionati da Pinecone.');

    const spiegazioniJson = await generateWineExplanations({ ...activityData, menuText, elencoBottiglie });
    console.log('[crea-carta] Spiegazioni generate da OpenAI.');
    
    const cartaId = await saveCartaToMongo({
      userId,
      userEmail: session.user.email,
      attivitaId,
      nomeLocale: activityData.nome,
      regione: activityData.regione,
      provincia: activityData.provincia,
      comune: activityData.comune,
      fascia: activityData.fascia,
      risultati: topSelections,
      spiegazioniJson,
      fileUrl: publicUrl,
      menuText,
      menuEmbedding,
      userPlan
    });
    console.log(`[crea-carta] ✅ Processo completato. Carta creata con ID: ${cartaId}`);

    return res.status(201).json({ success: true, id: cartaId });

  } catch (error) {
    console.error('[crea-carta] ERRORE NEL BLOCCO CATCH:', error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
}

export default withAuth(handler);