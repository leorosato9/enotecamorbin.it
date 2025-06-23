import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useFormState } from './genera-carta-vino/useFormState';
import { useLocationLogic } from './genera-carta-vino/useLocationLogic';
import { useSubmission } from './genera-carta-vino/useSubmission';
import { PLAN_CONFIG } from '../lib/config/plans';

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
  useEffect(() => {
    if (status === 'authenticated') {
      setIsLoadingActivities(true);
      fetch('/api/user/activities')
        .then(res => res.json())
        .then(data => setUserActivities(data.activities || []))
        .catch(err => console.error("Failed to fetch user's activities", err))
        .finally(() => setIsLoadingActivities(false));
    } else {
      setUserActivities([]);
    }
  }, [status]);
  
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

  return {
    ...formState,
    ...locationState,
    ...submissionState,
    onActivitySelect,
    authStatus: status,
    userActivities,
    isLoadingActivities,
    modalState,
    setModalState,
    handleLoginSuccess: update,
    restaurantLimitError,
    weeklyLimitError,
    selectedActivityId, 
  };
}