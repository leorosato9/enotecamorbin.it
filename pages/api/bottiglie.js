// /pages/api/bottiglie.js

import { connectToDatabase } from '../../lib/mongodb';

export default async function handler(req, res) {
  const { db } = await connectToDatabase();

  if (req.method === 'GET') {
    try {
      const bottiglie = await db.collection('bottiglie').find({}).toArray();
      const bottiglieFormatted = bottiglie.map((bottiglia) => ({
        ...bottiglia,
        _id: bottiglia._id.toString(),
      }));
      res.status(200).json(bottiglieFormatted);
    } catch (error) {
      console.error('Errore nel recupero delle bottiglie:', error);
      res.status(500).json({ error: 'Errore interno del server.' });
    }
  } else if (req.method === 'POST') {
    try {
      const { etichetta, categoria, provenienza, foto } = req.body;

      // Validazione dei campi obbligatori
      if (!etichetta || !categoria || !provenienza) {
        return res.status(400).json({ error: 'Etichetta, categoria e provenienza sono obbligatorie.' });
      }

      const bottiglia = {
        etichetta,
        categoria,
        provenienza,
        foto,
        createdAt: new Date(),
      };

      const result = await db.collection('bottiglie').insertOne(bottiglia);

      res.status(201).json({ ...bottiglia, _id: result.insertedId.toString() });
    } catch (error) {
      console.error('Errore nella creazione della bottiglia:', error);
      res.status(500).json({ error: 'Errore interno del server.' });
    }
  } else {
    res.status(405).json({ error: `Metodo '${req.method}' non consentito.` });
  }
}
