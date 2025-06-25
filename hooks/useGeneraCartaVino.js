import { useState, useEffect, useCallback } from 'react';
<<<<<<< HEAD
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';

=======
import { useSession } from 'next-auth/react';
>>>>>>> 17c5d397fdec7c41322ea05a053ec7707aee91f7
import { useFormState } from './genera-carta-vino/useFormState';
import { useLocationLogic } from './genera-carta-vino/useLocationLogic';
import { useSubmission } from './genera-carta-vino/useSubmission';
import { PLAN_CONFIG } from '../lib/config/plans';

<<<<<<< HEAD
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

  const directSubmission = useSubmission({
    filePdf: form.filePdf,
    nome: form.nome,
    regione: location.regione,
    provincia: location.provincia,
    comune: location.comune,
    fascia: form.fascia,
    activityId: selectedActivityId,
    setError: form.setError,
    setLoading: form.setLoading,
  });

  useEffect(() => {
    const claimRequest = async () => {
      const stagedId = sessionStorage.getItem(STAGING_ID_KEY);
      if (status === 'authenticated' && stagedId) {
        form.setLoading(true);
        sessionStorage.removeItem(STAGING_ID_KEY);
        try {
          const res = await fetch('/api/claim-menu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stagingId: stagedId }),
            credentials: 'include',
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message);
          router.push(`/results/${data.resultsId}`);
        } catch (err) {
          form.setError(`${err.message}`);
          form.setLoading(false);
        }
      }
    };
    claimRequest();
  }, [status, router, form]);

  const handleFormSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!form.filePdf) {
      form.setError('Devi caricare un menù prima di procedere.');
      return;
    }

    if (status === 'authenticated') {
      directSubmission.handleFormSubmit(e);
      return;
    }

    if (status === 'unauthenticated') {
      form.setLoading(true);
      const formData = new FormData();
      formData.append('file', form.filePdf);
      formData.append('nome', form.nome);
      formData.append('regione', location.regione);
      formData.append('provincia', location.provincia);
      formData.append('comune', location.comune);
      formData.append('fascia', form.fascia);

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
    }
  }, [status, form, location, directSubmission, router]);

  // --- LOGICA MANCANTE RE-INSERITA QUI ---
=======
export default function useGeneraCartaVino() {
  const { data: session, status, update } = useSession();
  const formState = useFormState();
  const locationState = useLocationLogic();
  const [modalState, setModalState] = useState({ isOpen: false, initialView: 'register' });
  const [userActivities, setUserActivities] = useState([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [restaurantLimitError, setRestaurantLimitError] = useState(null);
  const [weeklyLimitError, setWeeklyLimitError] = useState(null);

  // Questo useEffect carica le attività dell'utente in background, senza fare controlli
>>>>>>> 17c5d397fdec7c41322ea05a053ec7707aee91f7
  useEffect(() => {
    if (status === 'authenticated') {
      setLoadingActivities(true);
      fetch('/api/user/activities')
        .then(r => r.json())
        .then(d => setUserActivities(d.activities || []))
        .finally(() => setLoadingActivities(false));

      fetch('/api/user/carta-allowance')
        .then(r => r.json())
        .then(d => setWeeklyLimitError(d.canCreateMenu ? null : d.message))
        .catch(() => setWeeklyLimitError(null));
    }
  }, [status]);
<<<<<<< HEAD

  useEffect(() => {
    if (status === 'authenticated' && !isLoadingActivities) {
      const plan = session?.user?.plan || 'free';
      const max  = PLAN_CONFIG[plan]?.limits.restaurants;
      setRestaurantLimitError(
        userActivities.length >= max
          ? `Limite di ${max} attività raggiunto.`
          : null
      );
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
  // --- FINE LOGICA MANCANTE ---
=======
  
  // MODIFICA CHIAVE: Questi controlli ora dipendono da `showDetails`
  useEffect(() => {
    // I controlli sui limiti vengono eseguiti solo se l'utente è autenticato E se è nel secondo step del form.
    if (status === 'authenticated' && formState.showDetails) {
      
      // 1. Controllo limite settimanale
      fetch('/api/user/carta-allowance')
        .then(res => res.json())
        .then(data => {
            if (!data.canCreateMenu) {
                setWeeklyLimitError(data.message);
            } else {
                setWeeklyLimitError(null);
            }
        });

      // 2. Controllo limite attività
      const userPlan = session?.user?.plan || 'free';
      const restaurantLimit = PLAN_CONFIG[userPlan]?.limits.restaurants;
      if (typeof restaurantLimit === 'number' && userActivities.length >= restaurantLimit) {
        setRestaurantLimitError(`Hai raggiunto il limite di ${restaurantLimit} ristoranti per il tuo piano. Fai l'upgrade a Plus!`);
      } else {
        setRestaurantLimitError(null);
      }
    } else {
        // Resetta gli errori se l'utente torna indietro
        setWeeklyLimitError(null);
        setRestaurantLimitError(null);
    }
  }, [status, formState.showDetails, userActivities, session]);

  const onActivitySelect = useCallback((activity) => {
    if (activity) {
      setSelectedActivityId(activity._id);
      formState.setNome(activity.nome);
      locationState.setRegione(activity.regione);
      formState.setFascia(activity.fascia || '');
      setTimeout(() => {
        locationState.setProvincia(activity.provincia);
        setTimeout(() => locationState.setComune(activity.comune), 0);
      }, 0);
    } else {
      setSelectedActivityId(null);
      formState.setNome('');
      locationState.setRegione('');
      formState.setFascia('');
    }
  }, [formState.setNome, locationState.setRegione, formState.setFascia, locationState.setProvincia, locationState.setComune]);

  const submissionDependencies = {
    filePdf: formState.filePdf,
    nome: formState.nome,
    regione: locationState.regione,
    provincia: locationState.provincia,
    comune: locationState.comune,
    fascia: formState.fascia,
    setError: formState.setError,
    setLoading: formState.setLoading,
    activityId: selectedActivityId,
  };
  
  const submissionState = useSubmission(submissionDependencies);
>>>>>>> 17c5d397fdec7c41322ea05a053ec7707aee91f7

  return {
    nome: form.nome, setNome: form.setNome,
    fascia: form.fascia, setFascia: form.setFascia,
    filePdf: form.filePdf,
    loading: form.loading || directSubmission.loading,
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
<<<<<<< HEAD
    onActivitySelect,
    restaurantLimitError,
    weeklyLimitError,
    activityId: selectedActivityId,
    handleFormSubmit,
=======
    modalState,
    setModalState,
    handleLoginSuccess: update,
    restaurantLimitError,
    weeklyLimitError,
    selectedActivityId, 
>>>>>>> 17c5d397fdec7c41322ea05a053ec7707aee91f7
  };
}