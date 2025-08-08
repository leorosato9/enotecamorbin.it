import { nanoid } from 'nanoid';
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
  userPlan,
  startTime
}) {

  const cartaId = nanoid(8);
  const { db } = await connectToDatabase();
  const planEntry = PLAN_CONFIG[userPlan] || PLAN_CONFIG.free;

  const record = {
    _id:           cartaId,
    userId,
    userEmail,
    attivitaId,
    nomeLocale,
    regione,
    provincia,
    comune,
    fascia,
    risultati,
    spiegazioni:   spiegazioniJson,
    fileUrl,
    menuText,
    menuEmbedding,
    userPlan,
    regenerationCount:  0,
    regenerationLimit:  planEntry.limits.regenerationsPerMenu,
    startTime:         new Date(startTime),  // qui lo salviamo correttamente
    createdAt:         new Date(),
    status:           'completed'
  };

  await db.collection('cartavini').insertOne(record);
  await db.collection('attività').updateOne(
    { _id: attivitaId },
    { $addToSet: { carteViniIds: cartaId } }
  );

  return cartaId;
}

export async function updateCartaInMongo({ cartaId, updatedRisultati, updatedSpiegazioni }) {

  const { db } = await connectToDatabase();
  await db.collection('cartavini').updateOne(
    { _id: cartaId },
    {
      $set: { risultati: updatedRisultati, spiegazioni: updatedSpiegazioni },
      $inc: { regenerationCount: 1 }
    }
  );

  return await db.collection('cartavini').findOne({ _id: cartaId });
}
