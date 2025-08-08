import { withAuth } from '../../lib/auth/withAuth';
import { connectToDatabase } from '../../lib/mongodb';
import { checkRestaurantLimit } from '../../lib/services/limits/planLimiter';
import { nanoid } from 'nanoid'; // 👈 importa nanoid

async function attivitaHandler(req, res, session) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Metodo non consentito' });
  }

  const { nome, regione, provincia, comune, fascia } = req.body;

  try {
    const { db } = await connectToDatabase();
    const userPlan = session.user.plan || 'free';
    const userId = session.user.id;

    console.log(`[API /api/attivita] Controllo limiti per l'utente ${userId} con piano ${userPlan}`);
    
    await checkRestaurantLimit(db, userId, userPlan);
    
    console.log(`[API /api/attivita] Controllo limite superato. Procedo con la creazione.`);

    const shortId = nanoid(8);

    const nuovaAttivita = {
      _id: shortId,
      userEmail: session.user.email.toLowerCase(),
      userId: userId,
      nome: nome.trim(),
      regione,
      provincia,
      comune,
      fascia,
      createdAt: new Date(),
    };

    await db.collection('attività').insertOne(nuovaAttivita);

    return res.status(201).json({ success: true, message: 'Attività salvata', id: shortId });
    
  } catch (err) {
    if (err.statusCode === 403) {
      console.log('[API /api/attivita] Limite raggiunto, invio risposta "soft error" al client.');
      return res.status(200).json({ success: false, message: err.message });
    }
    
    console.error('[API /api/attivita] Errore imprevisto:', err);
    return res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Errore interno del server' });
  }
}

export default withAuth(attivitaHandler);
