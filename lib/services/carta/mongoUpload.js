import { randomUUID } from 'crypto';
import { connectToDatabase } from '../../mongodb.js';
import { ObjectId } from 'mongodb';

export async function saveCartaToMongo({ userId, userEmail, userPlan, nome, regione, provincia, comune, fascia, risultati, spiegazioniJson, fileUrl, attivitaId, menuText, menuEmbedding }) {
  const cartaId = randomUUID();
  const { db } = await connectToDatabase();

  const regenerationLimit = userPlan === 'plus' ? 5 : 3;

  await db.collection('cartavini').insertOne({
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
    createdAt: new Date(),
    regenerationCount: 0,
    regenerationLimit: regenerationLimit
  });

  await db.collection('attività').updateOne(
    { _id: new ObjectId(attivitaId) },
    { $addToSet: { carteViniIds: cartaId } }
  );

  console.log(`Carta Vini ${cartaId} collegata all'attività ${attivitaId}`);
  
  return cartaId;
}

export async function updateCartaInMongo({ cartaId, updatedRisultati, updatedSpiegazioni }) {
  const { db } = await connectToDatabase();

  const result = await db.collection('cartavini').updateOne(
    { _id: cartaId },
    {
      $set: {
        risultati: updatedRisultati, 
        spiegazioni: updatedSpiegazioni,
      },
      $inc: {
        regenerationCount: 1
      }
    }
  );

  if (result.matchedCount === 0) {
    throw new Error(`Nessuna carta trovata con ID: ${cartaId} per l'aggiornamento.`);
  }

  console.log(`Il documento ${cartaId} è stato aggiornato e il contatore di rigenerazione è stato incrementato.`);
}