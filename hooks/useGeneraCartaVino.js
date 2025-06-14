import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

import { useFormState } from './genera-carta-vino/useFormState';
import { useLocationLogic } from './genera-carta-vino/useLocationLogic';
import { useSubmission } from './genera-carta-vino/useSubmission';

// 1. Importiamo la nostra configurazione dei piani
import { PLAN_CONFIG } from '../lib/config/plans';


export default function useGeneraCartaVino() {
  // Aggiungiamo 'session' per accedere ai dati dell'utente, come il suo piano
  const { data: session, status, update } = useSession();
  const formState = useFormState();
  const locationState = useLocationLogic();

  const [modalState, setModalState] = useState({ isOpen: false, initialView: 'register' });
  
  const [userActivities, setUserActivities] = useState([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  // 2. Aggiungiamo lo stato per il messaggio di errore del limite
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
  
  // --- NUOVO useEffect PER CONTROLLARE I LIMITI ---
  useEffect(() => {
    // Eseguiamo il controllo solo se l'utente è autenticato e abbiamo finito di caricare le sue attività
    if (status === 'authenticated' && !isLoadingActivities) {
      const userPlan = session?.user?.plan || 'free';
      const restaurantLimit = PLAN_CONFIG[userPlan]?.limits.restaurants;

      // Se l'utente è su un piano con un limite numerico e lo ha raggiunto...
      if (typeof restaurantLimit === 'number' && userActivities.length >= restaurantLimit) {
        // ...impostiamo il messaggio di errore.
        setLimitError(`Hai raggiunto il limite di ${restaurantLimit} ristoranti per il piano ${PLAN_CONFIG[userPlan].name}. Fai l'upgrade a Plus!`);
      } else {
        // Altrimenti, ci assicuriamo che non ci sia nessun messaggio di errore.
        setLimitError(null);
      }
    }
  }, [status, userActivities, isLoadingActivities, session]); // Questo effetto si attiva quando i dati cambiano


  const { setNome, setFascia } = formState;
  const { setRegione, setProvincia, setComune } = locationState;

  const onActivitySelect = useCallback((activity) => {
    if (activity) {
      setNome(activity.nome);
      setRegione(activity.regione);
      setFascia(activity.fascia || '');
      setTimeout(() => {
        setProvincia(activity.provincia);
        setTimeout(() => setComune(activity.comune), 0);
      }, 0);
    } else {
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
    // Dovrai passare l'activityId selezionato anche qui
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
    // 3. Esportiamo il nuovo stato di errore così la pagina può passarlo al form
    limitError, 
  };
}
