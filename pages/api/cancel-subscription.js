import Stripe from 'stripe';
import { connectToDatabase } from '../../lib/mongodb';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  try {
    const { getServerSession } = await import('next-auth/next');
    const { authOptions } = await import('./auth/[...nextauth]'); // <-- verifica il path
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) return res.status(401).json({ error: 'Not authenticated' });

    const { db } = await connectToDatabase();
    const email = session.user.email.toLowerCase();
    const utente = await db.collection('utenti').findOne({ email });

    if (!utente?.stripeSubscriptionId) {
      return res.status(400).json({ error: 'Nessun abbonamento attivo da annullare' });
    }

    const sub = await stripe.subscriptions.update(utente.stripeSubscriptionId, {
      cancel_at_period_end: true
    });

    await db.collection('utenti').updateOne(
      { email },
      {
        $set: {
          cancelAtPeriodEnd: true,
          cancelAtDate: new Date(sub.current_period_end * 1000)
        }
      }
    );

    return res.json({
      ok: true,
      cancelAt: sub.current_period_end * 1000
    });
  } catch (err) {
    console.error('cancel-subscription error:', err);
    return res.status(400).json({ error: err.message || 'Errore annullamento' });
  }
}
