export const config = {
  api: { bodyParser: false }
};

import { withAuth } from '../../lib/auth/withAuth';
import { connectToDatabase } from '../../lib/mongodb';
import { parseForm }       from '../../lib/services/carta/formParser';
import { extractAndValidateData } from '../../lib/services/carta/dataExtractor';
import { checkRestaurantLimit }   from '../../lib/services/limits/planLimiter';
import { saveAttivita }           from '../../lib/services/attivita/saveAttivita';
import { processMenuFile }        from '../../lib/services/carta/textProcessor';
import { processPinecone }        from '../../lib/services/carta/wineSelection';
import { generateWineExplanations } from '../../lib/services/carta/promptOpenAI';
import { supabaseUpload }         from '../../lib/services/carta/supabaseUpload';
import { saveCartaToMongo }       from '../../lib/services/carta/mongoUpload';
import { ObjectId } from 'mongodb'; 

async function handler(req, res, session) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  const userId   = session.user.id;
  const userPlan = session.user.plan || 'free';
  const { db }   = await connectToDatabase();

  // parsing multipart
  const { fields, files } = await parseForm(req);

  // limiti attività
  const activityField = fields.activityId;
  const isNew         = !activityField || activityField === 'new';
  let activityId, activityData;

  if (isNew) {
    await checkRestaurantLimit(db, userId, userPlan);
    const act = extractAndValidateData({ fields, files }); 
    // extractAndValidateData restituisce anche filePath, fileType, etc.,
    // ma qui usiamo solo i campi testuali
    const { nome, regione, provincia, comune, fascia } = act;
    activityData = { nome, regione, provincia, comune, fascia };
    activityId   = await saveAttivita({ userId, userEmail: session.user.email, ...activityData });
  } else {
    activityId = Array.isArray(activityField) ? activityField[0] : activityField;
    const found = await db.collection('attività').findOne({ _id: new ObjectId(activityId), userId });
    if (!found) return res.status(404).json({ success: false, message: 'Attività non valida.' });
    activityData = {
      nome: found.nome,
      regione: found.regione,
      provincia: found.provincia,
      comune: found.comune,
      fascia: found.fascia
    };
  }

  // process
  const { filePath, fileType } = extractAndValidateData({ fields, files });
  const { text: menuText, embedding: menuEmbedding } = await processMenuFile({ filePath, fileType });
  const { elencoBottiglie, topSelections } = await processPinecone({ menuEmbedding, selectK: 12 });
  const spiegazioniJson = await generateWineExplanations({ ...activityData, menuText, elencoBottiglie });
  const publicUrl = await supabaseUpload(filePath, files.file[0].mimetype);
  const cartaId = await saveCartaToMongo({
    userId, userEmail: session.user.email,
    attivitaId: activityId,
    ...activityData,
    risultati: topSelections,
    spiegazioniJson,
    fileUrl: publicUrl,
    menuText,
    menuEmbedding,
    userPlan
  });

  return res.status(201).json({ success: true, id: cartaId, fileUrl: publicUrl });
}

export default withAuth(handler);
