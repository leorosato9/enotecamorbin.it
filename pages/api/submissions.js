import { connectToDatabase } from '../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: `Metodo ${req.method} non consentito` });
  }

  try {
    const { db } = await connectToDatabase();
    const submissions = await db
      .collection('menu')
      .find({}, { projection: { nome: 1, regione: 1, provincia: 1, comune: 1, lat:1, lng:1, createdAt:1 } })
      .sort({ createdAt: -1 })
      .toArray();
    return res.status(200).json(submissions);
  } catch (err) {
    console.error('Errore recupero submissions:', err);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
}
