import { useRouter } from 'next/router';
import { useState, useCallback } from 'react';

export function useSubmission({
  filePdf, nome, regione, provincia, comune, fascia, activityId,
  setError, setLoading
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormSubmit = useCallback(async e => {
    e.preventDefault();
    if (!filePdf) {
      setError('Devi caricare un menù prima di procedere.');
      return;
    }

    setLoading(true);
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('file', filePdf);
    formData.append('nome', nome);
    formData.append('regione', regione);
    formData.append('provincia', provincia);
    formData.append('comune', comune);
    formData.append('fascia', fascia);
    if (activityId && activityId !== 'new') {
      formData.append('activityId', activityId);
    }

    try {
      const res = await fetch('/api/crea-carta', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Errore durante la creazione.');
      }
      router.push(`/carta-vino/${data.id}`);
    } catch (err) {
      setError('Errore: ' + err.message);
      setLoading(false);
      setIsSubmitting(false);
    }
  }, [
    filePdf, nome, regione, provincia, comune, fascia,
    activityId, router, setError, setLoading
  ]);

  return { handleFormSubmit, loading: isSubmitting };
}
