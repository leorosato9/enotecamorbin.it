import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../../lib/mongodb';
import { processMenuFile } from '../../lib/services/carta/textProcessor';
import { processPinecone } from '../../lib/services/carta/wineSelection';
import { generateWineExplanations } from '../../lib/services/carta/promptOpenAI';
import { saveCartaToMongo } from '../../lib/services/carta/mongoUpload';
import { saveAttivita } from '../../lib/services/attivita/saveAttivita';
import { checkRestaurantLimit } from '../../lib/services/limits/planLimiter';
import fs from 'fs/promises';
import path from 'path';

async function downloadFile(url, tempDir) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`);
  const buffer = await response.arrayBuffer();
  const tempFilePath = path.join(tempDir, `temp_${Date.now()}`);
  await fs.writeFile(tempFilePath, Buffer.from(buffer));
  return tempFilePath;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Metodo non consentito' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    return res.status(401).json({ message: 'Non autorizzato.' });
  }

  const { stagingId } = req.body;
  if (!stagingId) {
    return res.status(400).json({ message: 'ID della richiesta mancante' });
  }

  let tempFilePath;

  try {
    const { db } = await connectToDatabase();
    const requestToClaim = await db.collection('richiesteInAttesa').findOne({
      _id: new ObjectId(stagingId),
      status: 'in_attesa_di_login',
    });

    if (!requestToClaim) {
      return res.status(404).json({ message: 'Richiesta non trovata o già elaborata.' });
    }
    
    // --- MODIFICA CHIAVE: ESEGUIAMO IL CONTROLLO SUI LIMITI ---
    // La funzione `checkRestaurantLimit` lancerà un errore se il limite è stato raggiunto.
    // L'errore verrà catturato dal blocco `catch` più in basso e inviato al frontend.
    const userPlan = session.user.plan || 'free';
    await checkRestaurantLimit(db, session.user.id, userPlan); // <-- 2. ESEGUIAMO IL CONTROLLO
    // -----------------------------------------------------------

    // Il resto della logica procede solo se il controllo dei limiti passa
    await db.collection('richiesteInAttesa').updateOne(
      { _id: new ObjectId(stagingId) },
      { $set: { status: 'completata', userId: session.user.id } }
    );
    
    const tempDir = '/tmp';
    tempFilePath = await downloadFile(requestToClaim.fileUrl, tempDir);

    
    const activityId = await saveAttivita({
        userId: session.user.id,
        userEmail: session.user.email,
        ...requestToClaim.formData
    });

    const { text: menuText, embedding: menuEmbedding } = await processMenuFile({ filePath: tempFilePath, fileType: requestToClaim.fileType });
    const { elencoBottiglie, topSelections } = await processPinecone({ menuEmbedding, selectK: 12 });
    const spiegazioniJson = await generateWineExplanations({ ...requestToClaim.formData, menuText, elencoBottiglie });

    const cartaId = await saveCartaToMongo({
      userId: session.user.id,
      userEmail: session.user.email,
      attivitaId: activityId,
      ...requestToClaim.formData,
      risultati: topSelections,
      spiegazioniJson,
      fileUrl: requestToClaim.fileUrl,
      menuText,
      menuEmbedding,
      userPlan: userPlan
    });

    res.status(200).json({ success: true, resultsId: cartaId });

  } catch (error) {
    console.error('Errore nel reclamare la richiesta:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Errore interno del server.'
    });
  } finally {
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (unlinkError) {
        console.error("Errore nel cancellare il file temporaneo:", unlinkError);
      }
    }
  }
}