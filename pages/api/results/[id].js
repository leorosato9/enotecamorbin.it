// pages/api/results/[id].js

import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb'; // Import necessario per la validazione

export default async function handler(req, res) {
  // 1. Log iniziale: vediamo se il file viene almeno raggiunto
  console.log('--- [API /api/results/[id]] Richiesta ricevuta ---');

  try {
    const { id } = req.query;
    // 2. Log dell'ID: vediamo quale ID stiamo ricevendo dalla URL
    console.log(`[API] ID ricevuto dalla URL: "${id}"`);

    if (req.method !== 'GET') {
      console.log(`[API] Metodo non valido: ${req.method}`);
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Metodo non consentito' });
    }

    // 3. Aggiungiamo un controllo robusto sull'ID
    if (!id || typeof id !== 'string' || id === 'undefined') {
      console.log(`[API] Errore: l'ID è non valido o mancante.`);
      return res.status(400).json({ error: 'ID non valido o mancante' });
    }

    console.log('[API] Connessione al database...');
    const { db } = await connectToDatabase();
    console.log('[API] Connesso. Eseguo la query sulla collezione "cartavini"...');

    // La query usa direttamente l'ID come stringa, come è salvato nel DB
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
      spiegazioni: record.spiegazioni || '[]', // Assicuriamoci sia una stringa JSON valida
      fileUrl: record.fileUrl || null,
      menuText: record.menuText,
      menuEmbedding: record.menuEmbedding
    });

  } catch (e) {
    // 4. Questo cattura qualsiasi errore inaspettato
    console.error('[API] ERRORE CRITICO nel blocco try/catch:', e);
    return res.status(500).json({ error: 'Errore interno del server.', details: e.message });
  }
}
