import { withAuth } from '../../../lib/auth/withAuth';
import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

async function respondHandler(req, res, session) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Metodo non consentito' });
  }

  const inviteeEmail = session.user.email.toLowerCase();
  const { inviteId, action } = req.body;

  if (!inviteId || !['accept', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'Dati non validi' });
  }

  try {
    const { db } = await connectToDatabase();
    const invite = await db.collection('inviti').findOne({ _id: new ObjectId(inviteId) });

    if (!invite) {
      return res.status(404).json({ message: 'Invito non trovato' });
    }
    if (invite.inviteeEmail !== inviteeEmail) {
      return res.status(403).json({ message: 'Non autorizzato' });
    }
    if (invite.status !== 'pending') {
      return res.status(400).json({ message: 'Invito già gestito' });
    }

    if (action === 'reject') {
      await db.collection('inviti').updateOne({ _id: new ObjectId(inviteId) }, { $set: { status: 'rejected' } });
      return res.status(200).json({ message: 'Invito rifiutato' });
    }

    if (action === 'accept') {
      await db.collection('attività').updateOne({ _id: new ObjectId(invite.activityId) }, { $addToSet: { collaboratori: inviteeEmail } });
      await db.collection('inviti').updateOne({ _id: new ObjectId(invite._id.toString()) }, { $set: { status: 'accepted' } });
      return res.status(200).json({ message: 'Invito accettato' });
    }
  } catch (err) {
    console.error('Errore in /api/inviti/respond:', err);
    return res.status(500).json({ message: 'Errore interno server' });
  }
}

export default withAuth(respondHandler);