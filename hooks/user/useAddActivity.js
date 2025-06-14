import { useState } from 'react';

export function useAddActivity({ onActivityAdded }) {
  const [nomeAtt, setNomeAtt] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitActivity = async ({ nome, regione, provincia, comune }) => {
    setError(null);
    if (!nome || !regione || !provincia || !comune) {
      setError('Compila tutti i campi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/attivita', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, regione, provincia, comune }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Errore sconosciuto');
      }

      onActivityAdded({
        _id: data.id,
        nome,
        regione,
        provincia,
        comune,
        createdAt: new Date().toISOString(),
        collaboratori: [],
      });
      
      setNomeAtt('');

    } catch (err) {
      console.error('Errore aggiunta attività:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    nomeAtt,
    setNomeAtt,
    error,
    isSubmitting,
    handleSubmitActivity,
  };
}