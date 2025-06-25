import { useState, useEffect, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';

import { useFormState } from './genera-carta-vino/useFormState';
import { useLocationLogic } from './genera-carta-vino/useLocationLogic';
import { PLAN_CONFIG } from '../lib/config/plans';

const STAGING_ID_KEY = 'pendingMenuStagingId';

export default function useGeneraCartaVino() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const form = useFormState();
  const location = useLocationLogic();

  const [userActivities, setUserActivities] = useState([]);
  const [isLoadingActivities, setLoadingActivities] = useState(false);
  const [restaurantLimitError, setRestaurantLimitError] = useState(null);
  const [weeklyLimitError, setWeeklyLimitError] = useState(null);
  const [selectedActivityId, setSelectedActivityId] = useState('new');

  // Hook che si attiva dopo il login per completare la richiesta
  useEffect(() => {
    const claimStagedRequest = async () => {
      const stagedId = sessionStorage.getItem(STAGING_ID_KEY);
      if (status === 'authenticated' && stagedId) {
        form.setLoading(true);
        sessionStorage.removeItem(STAGING_ID_KEY);
        try {
          const res = await fetch('/api/claim-menu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stagingId: stagedId }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Errore nel finalizzare la richiesta.');
          router.push(`/results/${data.resultsId}`); // Corretto per usare data.resultsId
        } catch (err) {
          form.setError(err.message);
          form.setLoading(false);
        }
      }
    };

    // --- MODIFICA CHIAVE ---
    // Usiamo router.isReady per essere sicuri che il router sia pronto
    if (router.isReady && status) {
        claimStagedRequest();
    }
  }, [status, router, form]); // Rimuoviamo 'isReady' e lasciamo 'router' che lo contiene


  // Logica di invio unificata
  const handleFormSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!form.filePdf) {
      form.setError('Devi caricare un menù prima di procedere.');
      return;
    }

    form.setLoading(true);
    form.setError('');

    const formData = new FormData();
    formData.append('file', form.filePdf);
    formData.append('nome', form.nome);
    formData.append('regione', location.regione);
    formData.append('provincia', location.provincia);
    formData.append('comune', location.comune);
    formData.append('fascia', form.fascia);
    formData.append('activityId', selectedActivityId);
    
    if (status === 'authenticated') {
      try {
        const res = await fetch('/api/crea-carta', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || `Errore ${res.status}`);
        router.push(`/results/${data.id}`);
      } catch (err) {
        form.setError(err.message);
        form.setLoading(false);
      }

    } else if (status === 'unauthenticated') {
      try {
        const res = await fetch('/api/stage-menu', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        sessionStorage.setItem(STAGING_ID_KEY, data.stagingId);
        signIn();
      } catch (err) {
        form.setError(`Errore: ${err.message}`);
        form.setLoading(false);
      }
    } else {
        form.setLoading(false);
    }
  }, [status, form, location, router, selectedActivityId]);

  
  // Il resto dell'hook rimane invariato
  useEffect(() => {
    if (status === 'authenticated') {
      setLoadingActivities(true);
      fetch('/api/user/activities').then(r => r.json()).then(d => setUserActivities(d.activities || [])).finally(() => setLoadingActivities(false));
      fetch('/api/user/carta-allowance').then(r => r.json()).then(d => setWeeklyLimitError(d.canCreateMenu ? null : d.message)).catch(() => setWeeklyLimitError(null));
    }
  }, [status]);

  useEffect(() => {
    if (status === 'authenticated' && !isLoadingActivities) {
      const plan = session?.user?.plan || 'free';
      const max  = PLAN_CONFIG[plan]?.limits.restaurants;
      setRestaurantLimitError(userActivities.length >= max ? `Limite di ${max} attività raggiunto.` : null);
    }
  }, [status, userActivities, isLoadingActivities, session]);

  const onActivitySelect = useCallback(activity => {
    if (activity) {
      setSelectedActivityId(activity._id);
      form.setNome(activity.nome);
      location.setRegione(activity.regione);
      location.setProvincia(activity.provincia);
      location.setComune(activity.comune);
      form.setFascia(activity.fascia || '');
    } else {
      setSelectedActivityId('new');
      form.setNome('');
      location.setRegione('');
      location.setProvincia('');
      location.setComune('');
      form.setFascia('');
    }
  }, [form, location]);
  
  useEffect(() => {
    const found = userActivities.find(a => a.nome === form.nome);
    setSelectedActivityId(found ? found._id : 'new');
  }, [form.nome, userActivities]);
  
  return {
    nome: form.nome, setNome: form.setNome,
    fascia: form.fascia, setFascia: form.setFascia,
    filePdf: form.filePdf,
    loading: form.loading,
    error: form.error,
    showDetails: form.showDetails, setShowDetails: form.setShowDetails,
    showPreview: form.showPreview, setShowPreview: form.setShowPreview,
    fileURL: form.fileURL,
    handleFileChange: form.handleFileChange,
    handleChangeMenu: form.handleChangeMenu,
    handleViewMenu: form.handleViewMenu,
    regione: location.regione, setRegione: location.setRegione,
    provincia: location.provincia, setProvincia: location.setProvincia,
    comune: location.comune, setComune: location.setComune,
    provinceList: location.provinceList,
    comuniList: location.comuniList,
    userActivities,
    isLoadingActivities,
    onActivitySelect,
    restaurantLimitError,
    weeklyLimitError,
    activityId: selectedActivityId,
    handleFormSubmit,
  };
}