import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { processMenuFile } from '../../../lib/services/carta/textProcessor';
import { processPinecone } from '../../../lib/services/carta/wineSelection';
import { generateWineExplanations } from '../../../lib/services/carta/promptOpenAI';
import { updateFinalCarta } from '../../../lib/services/carta/mongoUpload'; // Nuova funzione per l'aggiornamento
import path from 'path';
import fs from 'fs/promises';

// Funzione per scaricare il file da Supabase
async function downloadFile(url, tempDir) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`);
  const buffer = await response.arrayBuffer();
  const tempFilePath = path.join(tempDir, `temp_${Date.now()}`);
  await fs.writeFile(tempFilePath, Buffer.from(buffer));
  return tempFilePath;
}

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ message: 'ID mancante' });
  }

  // Rispondiamo subito 200 per dire che abbiamo ricevuto la richiesta
  res.status(200).json({ message: "Elaborazione in background avviata."});

  let tempFilePath;
  try {
    const { db } = await connectToDatabase();
    const cartaRecord = await db.collection('cartavini').findOne({ _id: id });
    if (!cartaRecord) throw new Error("Record non trovato");

    // Crea e pulisce la cartella temporanea
    const tempDir = path.resolve(process.cwd(), 'tmp');
    await fs.mkdir(tempDir, { recursive: true });
    tempFilePath = await downloadFile(cartaRecord.fileUrl, tempDir);

    // Esegui tutto il lavoro pesante
    const { text: menuText, embedding: menuEmbedding } = await processMenuFile({ filePath: tempFilePath, fileType: cartaRecord.fileType });
    const { elencoBottiglie, topSelections } = await processPinecone({ menuEmbedding, selectK: 12 });
    const spiegazioniJson = await generateWineExplanations({ ...cartaRecord.formData, menuText, elencoBottiglie });

    // Aggiorna il record nel DB con i risultati finali
    await updateFinalCarta({
      cartaId: id,
      risultati: topSelections,
      spiegazioniJson,
      menuText,
      menuEmbedding,
    });

  } catch (error) {
    console.error(`[background/generate-carta] Errore per l'ID ${id}:`, error);
    // Qui puoi aggiornare il record nel DB con uno stato di "errore" se vuoi
  } finally {
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(e => console.error("Errore nel cancellare file temp:", e));
    }
  }
}