import Head from 'next/head';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '../components/CheckoutForm';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function UpgradePage() {
  return (
    <>
      <Head>
        <title>Upgrade abbonamento</title>
      </Head>
      <Elements stripe={stripePromise}>
        <div className='scheda'>
          <h1>Fai l'upgrade al piano plus</h1>
          <CheckoutForm />
        </div>
      </Elements>
    </>
  );
}
