import { connectToDatabase } from '../../mongodb';

export async function getCartaLast7Days(userId) {
  const { db } = await connectToDatabase();
  const now = new Date();

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  console.log('[getCartaLast7Days] Calcolo 7 giorni fa:', sevenDaysAgo);

  const count = await db
    .collection('cartavini')
    .countDocuments({
      userId,
      createdAt: { $gte: sevenDaysAgo }
    });

  return count;
}
