import { connectToDatabase } from '../../../lib/mongodb';

export default async function handler(req, res) {
  console.log('--- [API /api/results/[id]] Richiesta ricevuta ---');

  try {
    const { id } = req.query;
    console.log(`[API] ID ricevuto dalla URL: "${id}"`);

    if (req.method !== 'GET') {
      console.log(`[API] Metodo non valido: ${req.method}`);
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Metodo non consentito' });
    }

    if (!id || typeof id !== 'string' || id === 'undefined') {
      console.log(`[API] Errore: l'ID è non valido o mancante.`);
      return res.status(400).json({ error: 'ID non valido o mancante' });
    }

    const { db } = await connectToDatabase();
    const record = await db.collection('cartavini').findOne({ _id: id });

    if (!record) {
      console.log(`[API] Record non trovato nel DB per l'ID: "${id}"`);
      return res.status(404).json({ error: `Record con ID ${id} non trovato` });
    }

    console.log(`[API] Record trovato per l'ID: "${id}". Invio la risposta.`);
    
    const risultatiConCategoria = (record.risultati || []).map(vino => ({
      ...vino,
      categoria: vino.metadata?.categoria || null,
    }));

    return res.status(200).json({
      nome: record.nomeLocale || record.nome,
      comune: record.comune,
      provincia: record.provincia,
      risultati: risultatiConCategoria,
      spiegazioni: record.spiegazioni || '[]',
      fileUrl: record.fileUrl || null,
      menuText: record.menuText,
      menuEmbedding: record.menuEmbedding,
      regenerationCount: record.regenerationCount || 0,
      regenerationLimit: record.regenerationLimit || 3,
    });

  } catch (e) {
    console.error('[API] ERRORE CRITICO nel blocco try/catch:', e);
    return res.status(500).json({ error: 'Errore interno del server.', details: e.message });
  }
}