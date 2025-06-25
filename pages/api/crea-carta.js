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
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  try {
    const userId   = session.user.id;
    const userPlan = session.user.plan || 'free';
    const { db }   = await connectToDatabase();

    const { fields, files } = await parseForm(req);
    
    // Controlliamo subito se il file è stato caricato
    const upload = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!upload || !upload.filepath) {
      throw new Error('File del menù mancante.');
    }
    const { filepath: filePath, mimetype: fileType } = upload;

    let activityData;
    let activityId;
    const activityField = fields.activityId;
    const isNewActivity = !activityField || activityField[0] === 'new';

    if (isNewActivity) {
      // --- FLUSSO PER NUOVA ATTIVITÀ ---
      await checkRestaurantLimit(db, userId, userPlan);
      // Validiamo i dati del form solo in questo caso
      const validatedData = extractAndValidateData({ fields, files });
      activityData = {
        nome: validatedData.nome,
        regione: validatedData.regione,
        provincia: validatedData.provincia,
        comune: validatedData.comune,
        fascia: validatedData.fascia
      };
      activityId = await saveAttivita({ userId, userEmail: session.user.email, ...activityData });

    } else {
      // --- FLUSSO PER ATTIVITÀ ESISTENTE ---
      activityId = activityField[0];
      const found = await db.collection('attività').findOne({ _id: new ObjectId(activityId), userId });
      if (!found) {
        return res.status(404).json({ success: false, message: 'Attività non valida o non appartenente a questo utente.' });
      }
      activityData = found; // Usiamo i dati sicuri dal DB
    }

    // --- PROCESSO DI GENERAZIONE COMUNE ---
    const publicUrl = await supabaseUpload(filePath, fileType);
    const { text: menuText, embedding: menuEmbedding } = await processMenuFile({ filePath, fileType });
    const { elencoBottiglie, topSelections } = await processPinecone({ menuEmbedding, selectK: 12 });
    const spiegazioniJson = await generateWineExplanations({ ...activityData, menuText, elencoBottiglie });
    
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

    return res.status(201).json({ success: true, id: cartaId });

  } catch (error) {
    console.error('[crea-carta] Errore:', error);
    // Invia un messaggio di errore più specifico al frontend
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
}

export default withAuth(handler);