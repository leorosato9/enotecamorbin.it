import { connectToDatabase } from '../../mongodb';

export async function saveAttivita({ userId, userEmail, nome, regione, provincia, comune, fascia }) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('attività');

    const filtro = { 
      userEmail: userEmail.toLowerCase(),
      nome: nome.trim()
    };
    
    const datiDaAggiornare = {
      $set: {
        regione,
        provincia,
        comune,
        fascia,
        lastUpdatedAt: new Date(),
        userId: userId 
      },
      $setOnInsert: {
        userEmail: userEmail.toLowerCase(),
        nome: nome.trim(),
        createdAt: new Date(),
        carteViniIds: []
      }
    };

    const result = await collection.updateOne(filtro, datiDaAggiornare, { upsert: true });

    let attivitaId;

    if (result.upsertedId) {
      attivitaId = result.upsertedId;
    } else {
      const attivitaEsistente = await collection.findOne(filtro);
      if (!attivitaEsistente) {
        throw new Error("Errore critico: attività non trovata dopo l'aggiornamento.");
      }
      attivitaId = attivitaEsistente._id;
    }

    await db.collection('utenti').updateOne(
      { _id: userId },
      { $addToSet: { attivitaIds: attivitaId } }
    );

    console.log(`Attività ${attivitaId} (${nome}) salvata/aggiornata per l'utente ${userId}`);
    return attivitaId;

  } catch (err) {
    console.error('Errore durante il salvataggio e collegamento della attività:', err);
    throw new Error("Impossibile salvare i dati dell'attività.");
  }
}
