import { randomUUID } from 'crypto';
import { connectToDatabase } from '../../mongodb.js';
import { PLAN_CONFIG } from '../../config/plans.js';

// Funzione per il salvataggio iniziale
export async function saveInitialCarta({ userId, attivitaId, fileUrl, fileType, userPlan, formData }) {
  const cartaId = randomUUID();
  const { db } = await connectToDatabase();
  
  const planEntry = PLAN_CONFIG[userPlan] || PLAN_CONFIG.free;
  const regenerationLimit = planEntry.limits.regenerationsPerMenu;

  const record = {
    _id: cartaId,
    userId,
    attivitaId,
    status: 'processing', // Stato iniziale
    formData,
    fileUrl,
    fileType,
    userPlan,
    createdAt: new Date(),
    regenerationLimit,
    regenerationCount: 0,
  };

  await db.collection('cartavini').insertOne(record);
  return cartaId;
}

// Funzione per l'aggiornamento finale
export async function updateFinalCarta({ cartaId, risultati, spiegazioniJson, menuText, menuEmbedding }) {
  const { db } = await connectToDatabase();
  
  await db.collection('cartavini').updateOne(
    { _id: cartaId },
    {
      $set: {
        status: 'completed', // Stato finale
        risultati,
        spiegazioni: spiegazioniJson,
        menuText,
        menuEmbedding,
        completedAt: new Date()
      }
    }
  );
}

export async function updateCartaInMongo({
  cartaId,
  updatedRisultati,
  updatedSpiegazioni
}) {
  console.log('[mongoUpload] ▶️ updateCartaInMongo start', { cartaId });

  const { db } = await connectToDatabase();

  const updateResult = await db.collection('cartavini').updateOne(
    { _id: cartaId },
    {
      $set: {
        risultati: updatedRisultati,
        spiegazioni: updatedSpiegazioni
      },
      $inc: { regenerationCount: 1 }
    }
  );

  console.log('[mongoUpload] ℹ️ updateOne result:', {
    matchedCount: updateResult.matchedCount,
    modifiedCount: updateResult.modifiedCount
  });

  if (updateResult.matchedCount === 0) {
    throw new Error(`Nessuna carta trovata con ID: ${cartaId} per l'aggiornamento.`);
  }

  // Se vuoi restituire il documento aggiornato, fai un findOne a posteriori:
  const updatedDoc = await db
    .collection('cartavini')
    .findOne({ _id: cartaId });

  console.log(`[mongoUpload] ✅ updateCartaInMongo end – Carta ${cartaId} aggiornata (count now ${updatedDoc.regenerationCount})`);
  return updatedDoc;
}
