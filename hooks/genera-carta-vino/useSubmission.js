import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

export function useSubmission({ filePdf, nome, regione, provincia, comune, fascia, setError, setLoading, activityId }) {
  const router = useRouter();
  const { status } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [shouldSubmitAfterAuth, setShouldSubmitAfterAuth] = useState(false);

  const handleActualSubmit = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append('file', filePdf);
    formData.append('nome', nome);
    formData.append('regione', regione);
    formData.append('provincia', provincia);
    formData.append('comune', comune);
    formData.append('fascia', fascia);
    if (activityId) {
      formData.append('activityId', activityId);
    }
    try {
      const res = await fetch('/api/crea-carta', { method: 'POST', body: formData });
      if (!res.ok) throw new Error((await res.json()).error || 'Errore sconosciuto');
      const { id } = await res.json();
      router.push(`/results/${id}`);
    } catch (err) {
      setError('Errore nella creazione della carta: ' + err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!showModal && shouldSubmitAfterAuth && status === 'authenticated') {
      setShouldSubmitAfterAuth(false);
      handleActualSubmit();
    }
  }, [showModal, shouldSubmitAfterAuth, status]);

  const handleFormSubmit = e => {
    e.preventDefault();
    if (!filePdf) {
      setError('Devi caricare un menù per poter generare la carta dei vini.');
      return;
    }
    if (status === 'authenticated') handleActualSubmit();
    else {
      setShouldSubmitAfterAuth(true);
      setShowModal(true);
    }
  };

  return {
    showModal,
    setShowModal,
    handleFormSubmit,
  };
}