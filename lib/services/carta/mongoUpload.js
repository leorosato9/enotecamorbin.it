import { randomUUID } from 'crypto';
import { connectToDatabase } from '../../mongodb.js';
import { PLAN_CONFIG } from '../../config/plans.js';

export async function saveCartaToMongo({
  userId,
  userEmail,
  nome,
  regione,
  provincia,
  comune,
  fascia,
  risultati,
  spiegazioniJson,
  fileUrl,
  attivitaId,
  menuText,
  menuEmbedding,
  userPlan
}) {
  console.log('[mongoUpload] ▶️ saveCartaToMongo start', { userPlan });

  const cartaId = randomUUID();
  const { db } = await connectToDatabase();

  const planEntry = PLAN_CONFIG[userPlan] || PLAN_CONFIG.free;
  const regenerationLimit = planEntry.limits.regenerationsPerMenu;
  console.log('[mongoUpload] ⚙️ regenerationLimit:', regenerationLimit);

  const record = {
    _id: cartaId,
    userId,
    userEmail,
    attivitaId,
    nomeLocale: nome,
    regione,
    provincia,
    comune,
    fascia,
    risultati,
    spiegazioni: spiegazioniJson,
    fileUrl,
    menuText,
    menuEmbedding,
    userPlan,
    createdAt: new Date(),
    regenerationCount: 0,
    regenerationLimit
  };

  await db.collection('cartavini').insertOne(record);
  await db.collection('attività').updateOne(
    { _id: attivitaId },
    { $addToSet: { carteViniIds: cartaId } }
  );

  console.log(`[mongoUpload] ✅ saveCartaToMongo end – Carta ${cartaId} collegata all'attività ${attivitaId}`);
  return cartaId;
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
