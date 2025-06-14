import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { regioni } from '../../data/locations';

export default function RestaurantForm({
  nome, setNome,
  regione, setRegione,
  provincia, setProvincia,
  comune, setComune,
  fascia, setFascia,
  provinceList,
  comuniList,
  onActivitySelect,
  loading,
  limitError,
}) {
  const { status } = useSession();
  const router = useRouter();
  const [userActivities, setUserActivities] = useState([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState('');

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

  const handleSelectActivity = (e) => {
    const activityId = e.target.value;
    setSelectedActivityId(activityId);
    if (typeof onActivitySelect === 'function') {
      const selected = activityId === 'new' || !activityId ? null : userActivities.find(act => act._id === activityId);
      onActivitySelect(selected);
    }
  };

  const showActivitySelector = status === 'authenticated' && userActivities.length > 0;
  const isNewActivity = selectedActivityId === 'new' || !selectedActivityId;
  
  const fieldsDisabled = !isNewActivity || !!limitError;

  return (
    <div className="riquadro2">
      <p className="riquadro2__main-text">Ristorante</p>
      <p className="riquadro2__sub-text">Crea il profilo della tua attività per personalizzare i risultati.</p>

      {status === 'loading' && <p>Verifica in corso...</p>}
      {isLoadingActivities && <p>Caricamento delle tue attività...</p>}

      {showActivitySelector && (
        <div>
          <label htmlFor="activity-select" className="labelTitle"></label>
          <select id="activity-select" className="noBorderSelect" value={selectedActivityId} onChange={handleSelectActivity} disabled={loading}>
            {userActivities.map(act => <option key={act._id} value={act._id}>{act.nome}</option>)}
            <option value="new">Crea nuova attività</option>
          </select>
        </div>
      )}

      {isNewActivity && limitError && (
        <div className="error-message-box">
          <p>{limitError}</p>
        </div>
      )}

      <div>
        <label htmlFor="nome" className="labelTitle">Insegna</label>
        <input className="underlineInput" type="text" id="nome" value={nome} onChange={e => setNome(e.target.value)} required disabled={loading || fieldsDisabled} />
      </div>

      {status !== 'authenticated' && (
        <p className='loginSubtitle'>
          Hai già un account?{' '}
          <Link href={`/login?callbackUrl=${encodeURIComponent(router.asPath)}`} legacyBehavior>
            <a className='loginSubtitleClick'>Accedi</a>
          </Link>
          {' '}per usare le tue attività salvate.
        </p>
      )}

      <label htmlFor="regione" className="labelTitle">Regione</label>
      <div className="region-buttons">
        {regioni.map(reg => (
          <button
            key={reg}
            type="button"
            className={`region-button ${regione === reg ? 'selected' : ''}`}
            onClick={() => setRegione(reg)}
            disabled={loading || fieldsDisabled}
          >
            {reg}
          </button>
        ))}
      </div>

      <label htmlFor="provincia" className="labelTitle">Provincia</label>
      <select id="provincia" className="noBorderSelect" value={provincia} onChange={e => setProvincia(e.target.value)} required disabled={!provinceList.length || loading || fieldsDisabled}>
        <option value="">Scegli</option>
        {provinceList.map(p => <option key={p} value={p}>{p}</option>)}
      </select>

      <label htmlFor="comune" className="labelTitle">Comune</label>
      <select id="comune" className="noBorderSelect" value={comune} onChange={e => setComune(e.target.value)} required disabled={!comuniList.length || loading || fieldsDisabled}>
        <option value="">Scegli</option>
        {comuniList.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      <label className="labelTitle">Fascia di prezzo</label>
      <div className="fascia-buttons">
        {['€', '€€', '€€€', '€€€€', '€€€€€'].map(sym => (
          <button
            key={sym}
            type="button"
            onClick={() => setFascia(sym)}
            className={`customBuyButton ${fascia === sym ? 'selected' : ''}`}
            disabled={loading || fieldsDisabled}
          >
            {sym}
          </button>
        ))}
      </div>
    </div>
  );
}
