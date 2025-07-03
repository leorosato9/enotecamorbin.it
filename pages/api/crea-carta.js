// pages/api/crea-carta.js
import { withAuth } from '../../lib/auth/withAuth';
import { connectToDatabase } from '../../lib/mongodb';
import { parseForm } from '../../lib/services/carta/formParser';
import { extractAndValidateData } from '../../lib/services/carta/dataExtractor';
import { checkRestaurantLimit } from '../../lib/services/limits/planLimiter';
import { saveAttivita } from '../../lib/services/attivita/saveAttivita';
import { processMenuFile } from '../../lib/services/carta/textProcessor';
import { processPinecone } from '../../lib/services/carta/wineSelection';
import { generateWineExplanations } from '../../lib/services/carta/promptOpenAI';
import { saveCartaToMongo } from '../../lib/services/carta/mongoUpload';
import { supabaseUpload } from '../../lib/services/carta/supabaseUpload';
import { ObjectId } from 'mongodb';

export const config = { api: { bodyParser: false } };

async function handler(req, res, session) {
  console.log('[crea-carta] START generation');
  if (req.method !== 'POST') {
    console.log('[crea-carta] Invalid method', req.method);
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const userId   = session.user.id;
    const userPlan = session.user.plan || 'free';
    const { db }   = await connectToDatabase();

    const { fields, files } = await parseForm(req);
    const upload = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!upload || !upload.filepath) throw new Error('File del menù mancante.');
    const { filepath: filePath, mimetype: fileType } = upload;

    let activityData, activityId;
    const activityIdFromForm = fields.activityId?.[0];
    const isNewActivity = !activityIdFromForm || activityIdFromForm === 'new';
    if (isNewActivity) {
      await checkRestaurantLimit(db, userId, userPlan);
      const validated = extractAndValidateData({ fields, files });
      activityData = {
        nome: validated.nome,
        regione: validated.regione,
        provincia: validated.provincia,
        comune: validated.comune,
        fascia: validated.fascia
      };
      activityId = await saveAttivita({ userId, userEmail: session.user.email, ...activityData });
      console.log('[crea-carta] Nuova attività creata', activityId, activityData.nome);
    } else {
      activityId = activityIdFromForm;
      const found = await db.collection('attività').findOne({ _id: new ObjectId(activityId), userId });
      if (!found) {
        console.log('[crea-carta] Attività non valida', activityId);
        return res.status(404).json({ success: false, message: 'Attività non valida.' });
      }
      activityData = found;
      console.log('[crea-carta] Uso attività esistente', activityId);
    }

    const publicUrl = await supabaseUpload(filePath, fileType);
    console.log('[crea-carta] File uploaded to', publicUrl);

    const { text: menuText, embedding: menuEmbedding } = await processMenuFile({ filePath, fileType });
    console.log('[crea-carta] Menu processed, text length:', menuText.length);

    const { elencoBottiglie, topSelections } = await processPinecone({ menuEmbedding, selectK: 12 });
    console.log('[crea-carta] Pinecone selections:', topSelections.length, 'bottiglie');

    // Genera spiegazioni in parallelo
    console.log('[crea-carta] Generating explanations for each bottle...');
    const explanationPromises = topSelections.map((v, idx) => {
      const nomeVino      = v.metadata.nomeVino   || v.metadata.nome_completo || '';
      const produttore    = v.metadata.produttore || '';
      const denominazione = v.metadata.denominazione || nomeVino;
      const annata        = v.metadata.annata ? ` ${v.metadata.annata}` : '';
      const singleList    = `- ${produttore} – ${denominazione}${annata}`;
      console.log(`[crea-carta] Queue explanation for [${idx}] ${denominazione}`);
      return generateWineExplanations({
        nome:      activityData.nome,
        regione:   activityData.regione,
        provincia: activityData.provincia,
        comune:    activityData.comune,
        fascia:    activityData.fascia,
        menuText,
        elencoBottiglie: singleList
      }).then(arr => {
        console.log(`[crea-carta] Explanation received for ${denominazione}, items:`, Array.isArray(arr) ? arr.length : 0);
        return arr[0] || { name: `${produttore} – ${denominazione}`, bullets: [], explanation: [] };
      });
    });

    const spiegazioniArray = await Promise.all(explanationPromises);
    console.log('[crea-carta] All explanations generated, total:', spiegazioniArray.length);

    const cartaId = await saveCartaToMongo({
      userId,
      userEmail: session.user.email,
      attivitaId: activityId,
      nomeLocale: activityData.nome,
      regione: activityData.regione,
      provincia: activityData.provincia,
      comune: activityData.comune,
      fascia: activityData.fascia,
      risultati: topSelections,
      spiegazioniJson: spiegazioniArray,
      fileUrl: publicUrl,
      menuText,
      menuEmbedding,
      userPlan
    });
    console.log('[crea-carta] Carta saved with ID', cartaId);

    return res.status(201).json({ success: true, id: cartaId });
  } catch (error) {
    console.error('[crea-carta] ERRORE:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export default withAuth(handler);
