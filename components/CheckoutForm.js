import { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { useRouter } from 'next/router';

export default function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('STEP 1: handleSubmit invocato');
    console.log('stripe:', stripe, 'elements:', elements);
    setErrorMsg('');
    if (!stripe || !elements) return;
    setLoading(true);

    const cardElement = elements.getElement(CardElement);
    const companyName = e.target.company_name.value;
    const taxId = e.target.tax_id.value;
    const email = e.target.email.value;
    const addressLine1 = e.target.address_line1.value;
    const city = e.target.city.value;
    const postalCode = e.target.postal_code.value;
    const state = e.target.state.value;
    const country = e.target.country.value;

    // Creazione del PaymentMethod con i dati di fatturazione
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: {
        name: companyName,
        email: email,
        address: {
          line1: addressLine1,
          city: city,
          postal_code: postalCode,
          state: state,
          country: country
        }
      }
    });
    console.log('STEP 2: createPaymentMethod →', { error, paymentMethod });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    // Invio dei dati al backend per creare/aggiornare la subscription
    try {
      const response = await fetch('/api/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method: paymentMethod.id,
          customer: {
            email,
            name: companyName,
            address: { line1: addressLine1, city, postal_code: postalCode, state, country },
            tax_id: taxId
          }
        })
      });

      const data = await response.json();
      console.log('STEP 3: /api/upgrade response →', data);

      if (data.error) {
        setErrorMsg(data.error);
        setLoading(false);
        return;
      }

      // Gestione 3D Secure se richiesta
      if (data.requires_action) {
        const { error: confirmError } = await stripe.confirmCardPayment(
          data.client_secret
        );
        if (confirmError) {
          setErrorMsg(confirmError.message);
          setLoading(false);
          return;
        }
      }

      // Tutto ok: reindirizza alla pagina di ringraziamento
      router.push('/grazie');
    } catch (err) {
      console.error('Errore fetch:', err);
      setErrorMsg('Errore di rete, riprova più tardi.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="company_name">Ragione sociale</label>
        <input id="company_name" name="company_name" type="text" required />
      </div>
      <div>
        <label htmlFor="tax_id">Partita IVA</label>
        <input id="tax_id" name="tax_id" type="text" required />
      </div>
      <div>
        <label htmlFor="email">Email di fatturazione</label>
        <input id="email" name="email" type="email" required />
      </div>
      <div>
        <label htmlFor="address_line1">Indirizzo (via e numero)</label>
        <input id="address_line1" name="address_line1" type="text" required />
      </div>
      <div>
        <label htmlFor="city">Città</label>
        <input id="city" name="city" type="text" required />
      </div>
      <div>
        <label htmlFor="postal_code">CAP</label>
        <input id="postal_code" name="postal_code" type="text" required />
      </div>
      <div>
        <label htmlFor="state">Provincia / Stato</label>
        <input id="state" name="state" type="text" required />
      </div>
      <div>
        <label htmlFor="country">Paese</label>
        <input id="country" name="country" type="text" defaultValue="IT" required />
      </div>
      <div>
        <CardElement options={{ hidePostalCode: true }} />
      </div>
      {errorMsg && <p>{errorMsg}</p>}
      <button type="submit" disabled={!stripe || loading} className='customBuyButton submitButton'>
        {loading ? 'Caricamento...' : 'Conferma upgrade a Plus'}
      </button>
    </form>
  );
}