import { withAuth } from '../../lib/auth/withAuth';
import { connectToDatabase } from '../../lib/mongodb';

import { checkRestaurantLimit } from '../../lib/services/limits/planLimiter';

async function attivitaHandler(req, res, session) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Metodo non consentito' });
  }

  const { nome, regione, provincia, comune } = req.body;
  if (!nome || !regione || !provincia || !comune) {
    return res.status(400).json({ message: 'Tutti i campi sono obbligatori' });
  }

  try {
    const { db } = await connectToDatabase();
    const userPlan = session.user.plan || 'free';
    const userId = session.user.id;

    await checkRestaurantLimit(db, userId, userPlan);
    
    const nuovaAttivita = {
      userEmail: session.user.email.toLowerCase(),
      userId: userId,
      nome: nome.trim(),
      regione,
      provincia,
      comune,
      createdAt: new Date(),
    };
    const result = await db.collection('attività').insertOne(nuovaAttivita);
    return res.status(201).json({ message: 'Attività salvata', id: result.insertedId });
    
  } catch (err) {
    if (err.statusCode === 403) {
      console.log('Limite raggiunto in /api/attivita, invio risposta "soft error" al client.');
      return res.status(200).json({ success: false, message: err.message });
    }
    
    console.error('Errore in /api/attivita:', err.message);
    return res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Errore interno del server' });
  }
}

export default withAuth(attivitaHandler);
