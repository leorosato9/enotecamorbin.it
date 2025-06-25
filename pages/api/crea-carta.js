import { withAuth } from '../../lib/auth/withAuth';
import { connectToDatabase } from '../../lib/mongodb';
import { parseForm } from '../../lib/services/carta/formParser';
import { extractAndValidateData } from '../../lib/services/carta/dataExtractor';
import { checkRestaurantLimit } from '../../lib/services/limits/planLimiter';
import { saveAttivita } from '../../lib/services/attivita/saveAttivita';
import { supabaseUpload } from '../../lib/services/carta/supabaseUpload';
import { saveInitialCarta } from '../../lib/services/carta/mongoUpload'; // Useremo una nuova funzione per il salvataggio iniziale

export const config = {
  api: { bodyParser: false }
};

async function handler(req, res, session) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  try {
    const userId = session.user.id;
    const userPlan = session.user.plan || 'free';
    const { db } = await connectToDatabase();

    const { fields, files } = await parseForm(req);
    const { nome, regione, provincia, comune, fascia, filePath, fileType } = extractAndValidateData({ fields, files });

    let activityId;
    if (!fields.activityId || fields.activityId[0] === 'new') {
      await checkRestaurantLimit(db, userId, userPlan);
      activityId = await saveAttivita({ userId, userEmail: session.user.email, nome, regione, provincia, comune, fascia });
    } else {
      activityId = fields.activityId[0];
    }
    
    // Carica subito il file e salva lo stato iniziale
    const fileUrl = await supabaseUpload(filePath, fileType);
    const cartaId = await saveInitialCarta({ // Nuova funzione per salvare lo stato iniziale
        userId,
        attivitaId: activityId,
        fileUrl,
        fileType,
        userPlan,
        formData: { nome, regione, provincia, comune, fascia }
    });

    // --- PUNTO CHIAVE ---
    // Invece di fare il lavoro pesante qui, invochiamo un'API "interna"
    // che Vercel eseguirà in background.
    const backgroundUrl = `${process.env.NEXT_PUBLIC_URL}/api/background/generate-carta?id=${cartaId}`;
    fetch(backgroundUrl); // Invochiamo l'URL senza attendere la risposta (fire-and-forget)

    // Rispondiamo immediatamente al frontend con l'ID della carta.
    return res.status(202).json({ success: true, id: cartaId });

  } catch (error) {
    console.error('[crea-carta] Errore:', error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
}

export default withAuth(handler);