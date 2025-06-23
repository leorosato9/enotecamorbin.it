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

  const [limitError, setLimitError] = useState(null);

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
  
  useEffect(() => {
    if (status === 'authenticated' && !isLoadingActivities) {
      const userPlan = session?.user?.plan || 'free';
      const restaurantLimit = PLAN_CONFIG[userPlan]?.limits.restaurants;

      if (typeof restaurantLimit === 'number' && userActivities.length >= restaurantLimit) {
        setLimitError(`Hai raggiunto il limite di ${restaurantLimit} ristoranti per il piano ${PLAN_CONFIG[userPlan].name}. Fai l'upgrade a Plus!`);
      } else {
        setLimitError(null);
      }
    }
  }, [status, userActivities, isLoadingActivities, session]);


  const { setNome, setFascia } = formState;
  const { setRegione, setProvincia, setComune } = locationState;

  const onActivitySelect = useCallback((activity) => {
    if (activity) {
      setSelectedActivityId(activity._id);
      setNome(activity.nome);
      setRegione(activity.regione);
      setFascia(activity.fascia || '');
      setTimeout(() => {
        setProvincia(activity.provincia);
        setTimeout(() => setComune(activity.comune), 0);
      }, 0);
    } else {
      setSelectedActivityId(null);
      setNome('');
      setRegione('');
      setFascia('');
    }
  }, [setNome, setRegione, setFascia, setProvincia, setComune]);

  const handleLoginSuccess = () => {
    update();
  };

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
    handleLoginSuccess,
    limitError,
    selectedActivityId, 
  };
}