// pages/api/stripe-webhook.js
import Stripe from 'stripe';
import { buffer } from 'micro';
import { connectToDatabase } from '../../lib/mongodb';

export const config = {
  api: { bodyParser: false }, // Stripe richiede il raw body
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('❌ Signature verify failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`\n💳 Webhook ricevuto: ${event.type}`);
  const { db } = await connectToDatabase();
  const utenti = db.collection('utenti');

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('📝 Session metadata:', session.metadata);
        console.log('📧 Email cliente:', session.customer_details?.email);

        const userId = session.metadata?.userId || null;
        const email =
          session.customer_details?.email ||
          session.customer_email ||
          session.metadata?.email ||
          null;

        const update = {
          plan: 'plus',
          stripeCustomerId: session.customer || null,
          stripeSubscriptionId: session.subscription || null,
          planUpdatedAt: new Date(),
        };

        let result;
        if (userId) {
          result = await utenti.updateOne({ _id: userId }, { $set: update });
          console.log(`🔍 Update via userId: matched=${result.matchedCount}, modified=${result.modifiedCount}`);
        } else if (email) {
          result = await utenti.updateOne({ email: email.toLowerCase() }, { $set: update });
          console.log(`🔍 Update via email: matched=${result.matchedCount}, modified=${result.modifiedCount}`);
        } else {
          console.warn('⚠️ Nessun userId/email disponibile per aggiornare.');
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('📄 Invoice per customer:', invoice.customer);

        const result = await utenti.updateOne(
          { stripeCustomerId: invoice.customer },
          { $set: { plan: 'plus', planUpdatedAt: new Date() } }
        );
        console.log(`🔍 Rinnovo: matched=${result.matchedCount}, modified=${result.modifiedCount}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        console.log('❌ Subscription cancellata:', sub.id);

        const result = await utenti.updateOne(
          { stripeSubscriptionId: sub.id },
          { $set: { plan: 'free', planUpdatedAt: new Date() } }
        );
        console.log(`🔍 Downgrade: matched=${result.matchedCount}, modified=${result.modifiedCount}`);
        break;
      }

      default:
        console.log(`ℹ️ Evento ${event.type} ignorato`);
        break;
    }

    return res.json({ received: true });
  } catch (e) {
    console.error('💥 Errore gestione webhook:', e);
    return res.status(500).json({ ok: false });
  }
}
