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
import { randomUUID } from 'crypto';

export const config = {
  api: { bodyParser: false }
};

async function handler(req, res, session) {
  // LOG 1: ID univoco per tracciare questa specifica richiesta nei log
  const requestId = randomUUID().slice(0, 8);
  console.log(`[${requestId}] ▶️ [crea-carta] Inizio esecuzione API.`);

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  try {
    const userId   = session.user.id;
    const userPlan = session.user.plan || 'free';
    console.log(`[${requestId}] Utente: ${userId}, Piano: ${userPlan}`);

    const { db }   = await connectToDatabase();
    const { fields, files } = await parseForm(req);
    
    console.log(`[${requestId}] Dati ricevuti dal form:`, JSON.stringify(fields, null, 2));
    
    const upload = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!upload || !upload.filepath) {
      throw new Error('[ERRORE] File del menù non trovato nel payload del form.');
    }
    const { filepath: filePath, mimetype: fileType } = upload;
    console.log(`[${requestId}] File ricevuto correttamente. Percorso temporaneo: ${filePath}`);

    let activityData;
    let activityId;
    
    const activityIdFromForm = fields.activityId?.[0];
    const isNewActivity = !activityIdFromForm || activityIdFromForm === 'new';
    console.log(`[${requestId}] Controllo attività: ID ricevuto='${activityIdFromForm}', isNewActivity=${isNewActivity}`);

    if (isNewActivity) {
      console.log(`[${requestId}] Flusso NUOVA attività avviato.`);
      await checkRestaurantLimit(db, userId, userPlan);
      console.log(`[${requestId}] Controllo limiti superato.`);
      
      const validatedData = extractAndValidateData({ fields, files });
      console.log(`[${requestId}] Dati validati:`, validatedData.nome);
      activityData = {
        nome: validatedData.nome,
        regione: validatedData.regione,
        provincia: validatedData.provincia,
        comune: validatedData.comune,
        fascia: validatedData.fascia
      };
      
      activityId = await saveAttivita({ userId, userEmail: session.user.email, ...activityData });
      console.log(`[${requestId}] Nuova attività salvata. ID generato: ${activityId}`);

    } else {
      console.log(`[${requestId}] Flusso ATTIVITÀ ESISTENTE avviato con ID: ${activityIdFromForm}`);
      activityId = activityIdFromForm;
      const found = await db.collection('attività').findOne({ _id: new ObjectId(activityId), userId });
      
      if (!found) {
        console.error(`[${requestId}] ERRORE: Attività ${activityId} non trovata per l'utente ${userId}.`);
        return res.status(404).json({ success: false, message: 'Attività non valida o non appartenente a questo utente.' });
      }
      activityData = found;
      console.log(`[${requestId}] Attività esistente trovata nel DB: ${activityData.nome}`);
    }

    console.log(`[${requestId}] Verifica pre-generazione -> activityId: ${activityId}, Nome attività: ${activityData?.nome}`);
    if(!activityId || !activityData) {
      throw new Error(`[ERRORE CRITICO] una delle variabili chiave non è definita. activityId: ${activityId}, activityData: ${!!activityData}`);
    }
    
    const publicUrl = await supabaseUpload(filePath, fileType);
    console.log(`[${requestId}] File caricato su Supabase: ${publicUrl}`);

    const { text: menuText, embedding: menuEmbedding } = await processMenuFile({ filePath, fileType });
    console.log(`[${requestId}] Testo ed embedding estratti.`);

    const { elencoBottiglie, topSelections } = await processPinecone({ menuEmbedding, selectK: 12 });
    console.log(`[${requestId}] ${topSelections.length} vini selezionati da Pinecone.`);

    const spiegazioniJson = await generateWineExplanations({ ...activityData, menuText, elencoBottiglie });
    console.log(`[${requestId}] Spiegazioni generate da OpenAI.`);
    
    const cartaId = await saveCartaToMongo({
      requestId, // Passiamo l'ID della richiesta per log concatenati
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
    console.log(`[${requestId}] ✅ Processo completato. Risposta inviata al client.`);

    return res.status(201).json({ success: true, id: cartaId });

  } catch (error) {
    console.error(`[${requestId}] ❌ ERRORE CATTURATO NEL BLOCCO FINALE:`, error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
}

export default withAuth(handler);