// pages/api/upgrade.js
import Stripe from 'stripe';
import { connectToDatabase } from '../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id || !session?.user?.email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const userId = new ObjectId(session.user.id);
  const userEmail = session.user.email.toLowerCase();

  const { payment_method, customer = {} } = req.body; // customer contiene solo dati di fatturazione (nome, indirizzo, PIVA...)
  if (!payment_method) return res.status(400).json({ error: 'Missing payment_method' });

  const { db } = await connectToDatabase();
  const utenti = db.collection('utenti');

  // 1) Recupera o crea lo Stripe Customer per QUESTO utente
  const me = await utenti.findOne({ _id: userId });
  let stripeCustomerId = me?.stripeCustomerId;

  if (!stripeCustomerId) {
    const created = await stripe.customers.create({
      email: userEmail,                // usa SEMPRE l'email della sessione
      name: customer.name || '',
      address: customer.address || {}, // oggetto Stripe valido
      metadata: { user_id: String(userId), user_email: userEmail },
    });
    stripeCustomerId = created.id;
  } else {
    await stripe.customers.update(stripeCustomerId, {
      email: userEmail,
      name: customer.name || '',
      address: customer.address || {},
    });
  }

  // 2) Attacca PM + default
  try { await stripe.paymentMethods.attach(payment_method, { customer: stripeCustomerId }); }
  catch (e) { if (e.code !== 'resource_already_exists') throw e; }

  await stripe.customers.update(stripeCustomerId, {
    invoice_settings: { default_payment_method: payment_method }
  });

  // 3) Crea subscription
  const subscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: [{ price: process.env.STRIPE_PRICE_PLUS }],
    expand: ['latest_invoice.payment_intent']
  });

  // 4) Salva sul TUO utente (per _id)
  await utenti.updateOne(
    { _id: userId },
    { $set: { stripeCustomerId, stripeSubscriptionId: subscription.id, planLinkingAt: new Date() } }
  );

  // (billing) salva i dati di fatturazione in una tabella a parte se vuoi

  const pi = subscription.latest_invoice?.payment_intent;
  if (pi?.status === 'requires_action') return res.json({ requires_action: true, client_secret: pi.client_secret });
  if (pi?.status === 'requires_payment_method') return res.status(402).json({ error: 'Payment failed' });
  return res.json({ success: true });
}
