import { connectToDatabase } from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const {
        titolo,
        descrizione,
        data,
        calici,
        postiDisponibili,
        slug,
        link,
        imagePath,
        selectedBottiglie,
        cicchetto, 
      } = req.body;

      if (!titolo || !descrizione || !data || !postiDisponibili || !slug) {
        return res.status(400).json({ error: 'Tutti i campi sono obbligatori.' });
      }

      const { db } = await connectToDatabase();

      const degustazione = {
        titolo,
        descrizione,
        data,
        calici,
        postiDisponibili: parseInt(postiDisponibili, 10),
        slug: slug.trim(),
        link: link,
        imagePath: imagePath || null, // Salva null se imagePath non è presente
        bottiglie: selectedBottiglie
          ? selectedBottiglie.map((id) => new ObjectId(id))
          : [], // Seleziona gli ID delle bottiglie, oppure array vuoto
        cicchetto: cicchetto === 'true', // Converte cicchetto in un booleano
        createdAt: new Date(),
      };

      const result = await db.collection('degustazioni').insertOne(degustazione);

      res.status(201).json({ ...degustazione, _id: result.insertedId });
    } catch (error) {
      console.error('Errore nella creazione della degustazione:', error);
      res.status(500).json({ error: 'Errore interno del server.' });
    }
  } else {
    res.status(405).json({ error: `Metodo '${req.method}' non consentito.` });
  }
}
