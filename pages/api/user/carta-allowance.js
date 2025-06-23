import { withAuth } from '../../../lib/auth/withAuth';
import { connectToDatabase } from '../../../lib/mongodb';
import { getMenuPerWeekStatus } from '../../../lib/services/limits/planLimiter';

async function handler(req, res, session) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { db } = await connectToDatabase();
        const userPlan = session.user.plan || 'free';
        const userId = session.user.id;

        const menuLimitStatus = await getMenuPerWeekStatus(db, userId, userPlan);
        
        return res.status(200).json({
            canCreateMenu: menuLimitStatus.allowed,
            message: menuLimitStatus.message || null,
        });

    } catch (error) {
        console.error('Error fetching user allowance status:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

export default withAuth(handler);