import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useUserPage({ initialActivities, currentUserEmail }) {
  const { status } = useSession();

  const [activities, setActivities] = useState(initialActivities || []);
  const [isSubmittingActivity, setIsSubmittingActivity] = useState(false);
  const [activitySubmitError, setActivitySubmitError] = useState(null);

  const handleAddActivity = async ({ nome, regione, provincia, comune, fascia }) => {
    setActivitySubmitError(null);
    if (!nome || !regione || !provincia || !comune) {
      setActivitySubmitError('Compila tutti i campi.');
      return false;
    }

    setIsSubmittingActivity(true);
    try {
      const response = await fetch('/api/attivita', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, regione, provincia, comune, fascia }),
      });
      const data = await response.json();
      
      if (!data.success) {
        setActivitySubmitError(data.message || 'Si è verificato un errore');
        return false;
      }
      
      const newActivity = { 
        _id: data.id, 
        nome, 
        regione, 
        provincia, 
        comune, 
        fascia,
        createdAt: new Date().toISOString(), 
        collaboratori: [],
        userEmail: currentUserEmail 
      };
      setActivities((prev) => [newActivity, ...prev]);
      return true;
    } catch (err) {
      console.error('Errore imprevisto durante l\'aggiunta dell\'attività:', err);
      setActivitySubmitError('Si è verificato un errore di rete. Riprova.');
      return false;
    } finally {
      setIsSubmittingActivity(false);
    }
  };

  const [pendingInvites, setPendingInvites] = useState([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(true);
  const [errorInvites, setErrorInvites] = useState(null);

  const handleInviteResponse = async (inviteId, action) => {
    try {
      const response = await fetch('/api/invite/respond', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, action }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Errore sconosciuto');
      }
      setPendingInvites((prev) => prev.filter((i) => i._id !== inviteId));
      if (action === 'accept') {
        location.reload();
      }
    } catch (err) {
      console.error('Errore risposta invito:', err);
      alert(err.message);
    }
  };

  return {
    activities,
    isSubmittingActivity,
    activitySubmitError,
    handleAddActivity,
    pendingInvites,
    isLoadingInvites,
    errorInvites,
    handleInviteResponse,
  };
}
