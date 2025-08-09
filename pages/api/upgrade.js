// pages/api/upgrade.js
import Stripe from 'stripe';
import { connectToDatabase } from '../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]'; // verifica il path se diverso

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });

// Normalizza l'indirizzo ricevuto dal form in un oggetto compatibile con Stripe + DB
function toStripeAddress(addr = {}) {
  // supporta sia {street, postal_code, city, province, country} che {line1, ...}
  const street = addr.line1 ?? addr.street ?? addr.via ?? '';
  return {
    line1: street || undefined,
    line2: addr.line2 ?? undefined,
    city: addr.city ?? undefined,
    postal_code: addr.postal_code ?? addr.cap ?? undefined,
    state: addr.state ?? addr.province ?? undefined,
    country: (addr.country || 'IT').toUpperCase(),
  };
}
function toDbAddress(addr = {}) {
  return {
    street: addr.line1 || addr.street || '',
    line2: addr.line2 || null,
    postal_code: addr.postal_code || addr.cap || '',
    city: addr.city || '',
    province: addr.state || addr.province || null,
    country: (addr.country || 'IT').toUpperCase(),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  try {
    // 0) sessione utente
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id || !session?.user?.email) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const userId = new ObjectId(String(session.user.id));
    const userEmail = session.user.email.toLowerCase();

    // 1) input dal form: payment_method + dati fatturazione
    const { payment_method, customer = {} } = req.body;
    if (!payment_method) return res.status(400).json({ error: 'Missing payment_method' });

    const stripeAddress = toStripeAddress(customer.address || {});
    const dbAddress = toDbAddress({ ...stripeAddress });

    const { db } = await connectToDatabase();
    const utenti = db.collection('utenti');

    // 2) crea/riusa lo Stripe Customer per QUESTO utente
    const me = await utenti.findOne({ _id: userId }, { projection: { stripeCustomerId: 1 } });
    let stripeCustomerId = me?.stripeCustomerId;

    if (!stripeCustomerId) {
      const created = await stripe.customers.create({
        email: userEmail, // sempre l'email della sessione
        name: customer.name || '',
        address: stripeAddress,
        metadata: { user_id: String(userId), user_email: userEmail, tax_id: customer.tax_id || '' }
      });
      stripeCustomerId = created.id;

      // (opzionale) registra P.IVA come Tax ID su Stripe se presente
      if (customer.tax_id) {
        try {
          await stripe.customers.createTaxId(stripeCustomerId, {
            type: 'eu_vat',
            value: customer.tax_id.replace(/^IT/i, 'IT')
          });
        } catch (e) {
          // non bloccare il flusso se fallisce
          console.warn('createTaxId failed:', e?.message);
        }
      }
    } else {
      await stripe.customers.update(stripeCustomerId, {
        email: userEmail,
        name: customer.name || '',
        address: stripeAddress,
        metadata: { user_id: String(userId), user_email: userEmail, tax_id: customer.tax_id || '' }
      });
    }

    // 3) attach del payment method + set default
    try {
      await stripe.paymentMethods.attach(payment_method, { customer: stripeCustomerId });
    } catch (e) {
      if (e?.code !== 'resource_already_exists') throw e;
    }
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: payment_method }
    });

    // 4) crea la subscription
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: process.env.STRIPE_PRICE_PLUS }],
      collection_method: 'charge_automatically',
      // automatic_tax: { enabled: true }, // abilita se usi Stripe Tax
      expand: ['latest_invoice.payment_intent'],
      metadata: { user_id: String(userId), user_email: userEmail }
    });

    // 5) SALVATAGGI
    // 5a) dentro "utenti" (sempre, aggiornando il tuo documento utente)
    await utenti.updateOne(
      { _id: userId },
      {
        $set: {
          stripeCustomerId,
          stripeSubscriptionId: subscription.id,
          planLinkingAt: new Date(),
          billingProfile: {
            companyName: customer.name || '',
            taxId: customer.tax_id || null,              // P.IVA
            codiceUnivoco: customer.codice_univoco || null,
            pec: customer.pec || null,
            fiscalCode: customer.fiscalCode || null,     // CF (se ditta individuale)
            address: dbAddress,
            updatedAt: new Date()
          }
        }
      },
      { upsert: true }
    );

    // 5b) anche una riga in "billing" (storico/audit)
    await db.collection('billing').insertOne({
      userId,
      userEmail,
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      companyName: customer.name || '',
      taxId: customer.tax_id || null,
      codiceUnivoco: customer.codice_univoco || null,
      pec: customer.pec || null,
      fiscalCode: customer.fiscalCode || null,
      address: dbAddress,
      createdAt: new Date()
    });

    // 6) risposta client in base allo stato del pagamento
    const pi = subscription.latest_invoice?.payment_intent;
    if (pi?.status === 'requires_action') {
      return res.json({ requires_action: true, client_secret: pi.client_secret });
    }
    if (pi?.status === 'requires_payment_method') {
      return res.status(402).json({ error: 'Payment failed, try another method.' });
    }

    return res.json({ success: true, subscriptionStatus: subscription.status });
  } catch (err) {
    console.error('upgrade error:', err);
    return res.status(400).json({ error: err.message || 'Stripe processing error' });
  }
}
