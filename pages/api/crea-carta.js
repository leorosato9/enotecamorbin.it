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
  console.log('[crea-carta] START');
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  try {
    const userId = session.user.id;
    const userPlan = session.user.plan || 'free';
    const { db } = await connectToDatabase();

    const { fields, files } = await parseForm(req);
    const upload = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!upload?.filepath) throw new Error('File mancante');
    const { filepath, mimetype } = upload;

    let activityData, activityId;
    const actIdField = fields.activityId?.[0];
    if (!actIdField || actIdField === 'new') {
      await checkRestaurantLimit(db, userId, userPlan);
      const vd = extractAndValidateData({ fields, files });
      activityData = { nome: vd.nome, regione: vd.regione, provincia: vd.provincia, comune: vd.comune, fascia: vd.fascia };
      activityId = await saveAttivita({ userId, userEmail: session.user.email, ...activityData });
      console.log('[crea-carta] Nuova attività', activityId);
    } else {
      activityId = actIdField;
      const found = await db.collection('attività').findOne({ _id: new ObjectId(activityId), userId });
      if (!found) return res.status(404).json({ success: false, message: 'Attività non valida' });
      activityData = found;
      console.log('[crea-carta] Attività esistente', activityId);
    }

    const publicUrl = await supabaseUpload(filepath, mimetype);
    console.log('[crea-carta] File URL', publicUrl);

    const { text: menuText, embedding: menuEmbedding } = await processMenuFile({ filePath: filepath, fileType: mimetype });
    console.log('[crea-carta] Testo estratto', menuText.length);

    const { elencoBottiglie, topSelections } = await processPinecone({ menuEmbedding, selectK: 12 });
    console.log('[crea-carta] Bottiglie selezionate', topSelections.length);

    const promises = topSelections.map((v, i) => {
      const nomeVino = v.metadata.nomeVino || v.metadata.nome_completo || '';
      const produttore = v.metadata.produttore || '';
      const denominazione = v.metadata.denominazione || nomeVino;
      const annata = v.metadata.annata ? ` ${v.metadata.annata}` : '';
      const single = `- ${produttore} – ${denominazione}${annata}`;
      console.log(`[crea-carta] Richiesta expl [${i}]`, denominazione);
      return generateWineExplanations({
        nome: activityData.nome,
        regione: activityData.regione,
        provincia: activityData.provincia,
        comune: activityData.comune,
        fascia: activityData.fascia,
        menuText,
        elencoBottiglie: single
      })
      .then(arr => arr[0] || { name: `${produttore} – ${denominazione}`, bullets: [], explanation: [] });
    });

    const spiegazioni = await Promise.all(promises);
    console.log('[crea-carta] Spiegazioni ottenute', spiegazioni.length);

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
      spiegazioniJson: spiegazioni,
      fileUrl: publicUrl,
      menuText,
      menuEmbedding,
      userPlan
    });
    console.log('[crea-carta] Carta salvata', cartaId);
    return res.status(201).json({ success: true, id: cartaId });

  } catch (err) {
    console.error('[crea-carta] ERRORE:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

export default withAuth(handler);
