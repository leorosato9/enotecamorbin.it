// Next.js API Route
import { connectToDatabase } from '../../../lib/mongodb';

export default async function handler(req, res) {
  const { start, end } = req.query;
  const { db } = await connectToDatabase();

  const s = new Date(start);
  const e = new Date(end);
  const diffMs = e - s;
  const diffDays = diffMs / (1000*60*60*24);

  let groupId;
  if (diffDays > 90) {
    groupId = { year: { $year:'$createdAt' }, month: { $month:'$createdAt' } };
  } else if (diffDays > 1) {
    groupId = { 
      year:  { $year:'$createdAt' },
      month: { $month:'$createdAt' },
      day:   { $dayOfMonth:'$createdAt' }
    };
  } else {
    groupId = {
      year:  { $year:'$createdAt' },
      month: { $month:'$createdAt' },
      day:   { $dayOfMonth:'$createdAt' },
      hour:  { $hour:'$createdAt' }
    };
  }

  const agg = await db.collection('cartavini').aggregate([
    { $match: { createdAt: { $gte: s, $lte: e } } },
    { $group: { _id: groupId, count: { $sum: 1 } } },
    { $sort: { '_id.year':1, '_id.month':1, '_id.day':1, '_id.hour':1 } }
  ]).toArray();

  // Trasformiamo in array { date: string, count }
  const data = agg.map(d => {
    const id = d._id;
    let label;
    if ('hour' in id) {
      // ora
      label = `${String(id.hour).padStart(2,'0')}:00`;
    } else if ('day' in id) {
      label = `${String(id.day).padStart(2,'0')}/${String(id.month).padStart(2,'0')}`;
    } else {
      label = `${String(id.month).padStart(2,'0')}/${id.year}`;
    }
    return { date: label, count: d.count };
  });

  res.status(200).json({ data });
}
