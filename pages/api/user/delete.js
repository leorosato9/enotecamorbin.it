import { withAuth } from '../../../lib/auth/withAuth';
import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

async function deleteUserHandler(req, res, session) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ message: 'Metodo non consentito' });
  }

  const userIdToDelete = session.user.id;
  console.log(`Richiesta di eliminazione per l'utente con ID: ${userIdToDelete}`);

  try {
    const { db } = await connectToDatabase();


    const carteDeleteResult = await db.collection('cartavini').deleteMany({ userId: userIdToDelete });
    console.log(`${carteDeleteResult.deletedCount} carte vini eliminate.`);

    const attivitaDeleteResult = await db.collection('attività').deleteMany({ userId: userIdToDelete });
    console.log(`${attivitaDeleteResult.deletedCount} attività eliminate.`);

    const userDeleteResult = await db.collection('utenti').deleteOne({ _id: new ObjectId(userIdToDelete) });
    if (userDeleteResult.deletedCount === 0) {
      return res.status(404).json({ message: 'Utente non trovato.' });
    }
    console.log(`Utente ${userIdToDelete} eliminato con successo.`);
    

    return res.status(200).json({ success: true, message: 'Account e tutti i dati associati eliminati con successo.' });

  } catch (err) {
    console.error(`Errore durante l'eliminazione dell'utente ${userIdToDelete}:`, err);
    return res.status(500).json({ message: 'Errore interno del server' });
  }
}

export default withAuth(deleteUserHandler);