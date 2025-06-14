import { withAuth } from '../../../lib/auth/withAuth';
import { connectToDatabase } from '../../../lib/mongodb';

async function handler(req, res, session) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    const userEmail = session.user.email.toLowerCase();

    const activities = await db
      .collection('attività')
      .find({
        $or: [{ userEmail: userEmail }, { collaboratori: userEmail }],
      })
      .sort({ nome: 1 })
      .project({ nome: 1, regione: 1, provincia: 1, comune: 1, fascia: 1 })
      .toArray();

    const sanitizedActivities = activities.map(act => ({
        ...act,
        _id: act._id.toString(),
    }));

    return res.status(200).json({ activities: sanitizedActivities });
  } catch (error) {
    console.error('Error fetching user activities:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

export default withAuth(handler);
