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
  const [userActivities, setUserActivities] = useState([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  
  const [restaurantLimitError, setRestaurantLimitError] = useState(null);
  const [weeklyLimitError, setWeeklyLimitError] = useState(null);

  useEffect(() => {
    if (status === 'authenticated') {
      // Controlla il limite settimanale
      fetch('/api/user/carta-allowance')
        .then(res => res.json())
        .then(data => {
          if (!data.canCreateMenu) {
            setWeeklyLimitError(data.message);
          }
        });
      
      // Carica le attività dell'utente
      setIsLoadingActivities(true);
      fetch('/api/user/activities')
        .then(res => res.json())
        .then(data => setUserActivities(data.activities || []))
        .finally(() => setIsLoadingActivities(false));
    }
  }, [status]);
  
  useEffect(() => {
    if (status === 'authenticated' && !isLoadingActivities) {
      const userPlan = session?.user?.plan || 'free';
      const limit = PLAN_CONFIG[userPlan]?.limits.restaurants;
      if (typeof limit === 'number' && userActivities.length >= limit) {
        setRestaurantLimitError(`Hai raggiunto il limite di ${limit} attività per il tuo piano.`);
      } else {
        setRestaurantLimitError(null);
      }
    }
  }, [status, userActivities, isLoadingActivities, session]);

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
      setSelectedActivityId('new'); // Usa 'new' per indicare la creazione
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
    activityId: selectedActivityId === 'new' ? 'new' : selectedActivityId,
  };
  
  const submissionState = useSubmission(submissionDependencies);

  return {
    ...formState, ...locationState, ...submissionState,
    onActivitySelect,
    authStatus: status,
    userActivities,
    isLoadingActivities,
    // Esporta i due errori separati
    restaurantLimitError, 
    weeklyLimitError,
  };
}