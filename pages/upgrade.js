// pages/upgrade.js
import Head from 'next/head';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import CheckoutForm from '../components/CheckoutForm';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function UpgradePage({ plan, userEmail, cancelAtPeriodEnd, cancelAtDate }) {
  const isPlus = plan === 'plus';
  const [busy, setBusy] = React.useState(false);
  const [localCancel, setLocalCancel] = React.useState(cancelAtPeriodEnd);
  const [localCancelDate, setLocalCancelDate] = React.useState(cancelAtDate);

  function fmt(dateMs) {
    try {
      return new Date(dateMs).toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return '';
    }
  }

  async function onCancel() {
    setBusy(true);
    try {
      const r = await fetch('/api/cancel-subscription', { method: 'POST' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Errore');
      setLocalCancel(true);
      if (data.cancelAt) setLocalCancelDate(data.cancelAt);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function onUncancel() {
    setBusy(true);
    try {
      const r = await fetch('/api/uncancel-subscription', { method: 'POST' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Errore');
      setLocalCancel(false);
      setLocalCancelDate(null);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Head><title>Upgrade abbonamento</title></Head>
      <Header/>
      <div className="scheda">
        {isPlus ? (
          <>
            <h1>Sei già Plus 🎉</h1>
            {userEmail && <p>Account: {userEmail}</p>}

            {localCancel ? (
              <>
                <p>
                  Il tuo abbonamento terminerà il <strong>{fmt(localCancelDate)}</strong>. Fino ad allora resti Plus.
                </p>
              </>
            ) : (
              <>
                <p>
                  Vuoi interrompere il rinnovo automatico? Resterai Plus fino alla fine del periodo già pagato.
                </p>
                <button onClick={onCancel} disabled={busy} className="submitButton customBuyButton">
                  {busy ? 'Attendo…' : 'Annulla rinnovo'}
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <h1>Fai l'upgrade al piano Plus</h1>
            <Elements stripe={stripePromise}>
              <CheckoutForm />
            </Elements>
          </>
        )}
      </div>
      <Footer/>
    </>
  );
}

import React from 'react';

export async function getServerSideProps(ctx) {
  const { getServerSession } = await import('next-auth/next');
  const { authOptions } = await import('./api/auth/[...nextauth]');
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session?.user?.email) {
    return { redirect: { destination: '/login?next=/upgrade', permanent: false } };
  }

  const email = session.user.email.toLowerCase();

  const { connectToDatabase } = await import('../lib/mongodb');
  const { db } = await connectToDatabase();
  const user = await db.collection('utenti').findOne(
    { email },
    { projection: { plan: 1, stripeSubscriptionId: 1, cancelAtPeriodEnd: 1, cancelAtDate: 1 } }
  );

  let plan = user?.plan || 'free';
  let cancelAtPeriodEnd = user?.cancelAtPeriodEnd || false;
  let cancelAtDate = user?.cancelAtDate ? new Date(user.cancelAtDate).getTime() : null;

  if (plan === 'plus' && user?.stripeSubscriptionId) {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });
    try {
      const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      cancelAtPeriodEnd = sub.cancel_at_period_end;
      cancelAtDate = sub.current_period_end ? sub.current_period_end * 1000 : cancelAtDate;
    } catch (e) {
    }
  }

  return {
    props: { plan, userEmail: email, cancelAtPeriodEnd, cancelAtDate }
  };
}
