import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { payment_method, customer } = req.body;

    // 1. Creazione o recupero del Customer con dati completi
    const stripeCustomer = await stripe.customers.create({
      email: customer.email,
      name: customer.name,
      address: customer.address,
      metadata: { tax_id: customer.tax_id }
    });

    // 2. Allegare il metodo di pagamento al Customer
    await stripe.paymentMethods.attach(
      payment_method,
      { customer: stripeCustomer.id }
    );

    // 3. Impostare il metodo di pagamento predefinito per il Customer
    await stripe.customers.update(stripeCustomer.id, {
      invoice_settings: { default_payment_method: payment_method }
    });

    // 4. Creazione della subscription con trial di 30 giorni
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomer.id,
      items: [{ price: process.env.STRIPE_PRICE_PLUS }],
   // trial_period_days: 30, 
      expand: ['latest_invoice.payment_intent']
    });

    const invoice = subscription.latest_invoice;
    const intent = invoice.payment_intent;

    if (intent && intent.status === 'requires_action') {
      return res.json({
        requires_action: true,
        client_secret: intent.client_secret
      });
    }

    // Subscription attivata con successo
    return res.json({ success: true });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(400).json({ error: err.message });
  }
}
