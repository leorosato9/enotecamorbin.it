// lib/services/carta/mongoUpload.js
import { randomUUID } from 'crypto';
import { connectToDatabase } from '../../mongodb.js';
import { PLAN_CONFIG } from '../../config/plans.js';

export async function saveCartaToMongo({
  userId,
  userEmail,
  attivitaId,
  nomeLocale,
  regione,
  provincia,
  comune,
  fascia,
  risultati,
  spiegazioniJson,
  fileUrl,
  menuText,
  menuEmbedding,
  userPlan
}) {
  console.log('[mongoUpload] Inizio salvataggio completo per carta...');

  const cartaId = randomUUID();
  const { db } = await connectToDatabase();

  const planEntry = PLAN_CONFIG[userPlan] || PLAN_CONFIG.free;
  const regenerationLimit = planEntry.limits.regenerationsPerMenu;

  // Assicuriamoci di salvare un vero array, non una stringa
  const spiegazioniArray = Array.isArray(spiegazioniJson) ? spiegazioniJson : [];

  const record = {
    _id: cartaId,
    userId,
    userEmail,
    attivitaId,
    nomeLocale,
    regione,
    provincia,
    comune,
    fascia,
    risultati,
    spiegazioni: spiegazioniArray,
    fileUrl,
    menuText,
    menuEmbedding,
    userPlan,
    createdAt: new Date(),
    status: 'completed',
    regenerationCount: 0,
    regenerationLimit
  };

  await db.collection('cartavini').insertOne(record);
  await db.collection('attività').updateOne(
    { _id: attivitaId },
    { $addToSet: { carteViniIds: cartaId } }
  );

  console.log(`[mongoUpload] ✅ Carta ${cartaId} salvata e collegata all'attività ${attivitaId}`);
  return cartaId;
}

export async function updateCartaInMongo({
  cartaId,
  updatedRisultati,
  updatedSpiegazioni
}) {
  console.log('[mongoUpload] Inizio aggiornamento per rigenerazione carta:', { cartaId });

  const { db } = await connectToDatabase();

  const spiegazioniArray = Array.isArray(updatedSpiegazioni) ? updatedSpiegazioni : [];

  const updateResult = await db.collection('cartavini').updateOne(
    { _id: cartaId },
    {
      $set: {
        risultati: updatedRisultati,
        spiegazioni: spiegazioniArray
      },
      $inc: { regenerationCount: 1 }
    }
  );

  if (updateResult.matchedCount === 0) {
    throw new Error(`Nessuna carta trovata con ID: ${cartaId} per l'aggiornamento.`);
  }

  console.log(`[mongoUpload] ✅ Carta ${cartaId} aggiornata con successo.`);
  const updatedDoc = await db.collection('cartavini').findOne({ _id: cartaId });
  return updatedDoc;
}
