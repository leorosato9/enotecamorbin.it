import React, { useEffect } from 'react';
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
  userActivities,
  onActivitySelect,
  loading,
  error,
}) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (userActivities.length > 0) {
      onActivitySelect(userActivities[0]);
    } else {
      onActivitySelect(null);
    }
  }, [userActivities]);
  
  const handleSelectActivity = (e) => {
    const activityId = e.target.value;
    const selected = activityId === 'new' ? null : userActivities.find(act => act._id === activityId);
    onActivitySelect(selected);
  };
  
  const isCreatingNew = !userActivities.some(act => act.nome === nome);
  const fieldsDisabled = loading || !isCreatingNew;

  return (
    <div className="riquadro2">
      <p className="riquadro2__main-text">Ristorante</p>
      
      {status === 'authenticated' && userActivities.length > 0 && (
        <div>
          <label htmlFor="activity-select" className="riquadro2__sub-text">Seleziona un'attività esistente</label>
          <select 
            id="activity-select" 
            className="noBorderSelect" 
            onChange={handleSelectActivity} 
            disabled={loading}
            value={isCreatingNew ? 'new' : userActivities.find(act => act.nome === nome)?._id || 'new'}
          >
            {userActivities.map(act => <option key={act._id} value={act._id}>{act.nome}</option>)}
            <option value="new">- Crea nuova -</option>
          </select>
        </div>
      )}

      {error ? (
        <div className="error-message-box">
          <p>{error}</p>
        </div>
      ) : (
        <div className='new-activity-fields'>
          {(status === 'authenticated' && userActivities.length > 0) && <hr style={{ margin: '2rem 0' }} />}

          {status !== 'authenticated' && (
             <p className='loginSubtitle'>
              Hai già un account?{' '}
              <Link href={`/login?callbackUrl=${encodeURIComponent(router.asPath)}`} legacyBehavior>
                <a className='loginSubtitleClick'>Accedi</a>
              </Link>
              {' '}per usare le tue attività salvate.
            </p>
          )}

          <div style={{ opacity: isCreatingNew ? 1 : 0.5, transition: 'opacity 0.3s' }}>
            <div>
              <label htmlFor="nome" className="labelTitle">Insegna</label>
              <input className="underlineInput" type="text" id="nome" value={nome} onChange={e => setNome(e.target.value)} required disabled={fieldsDisabled} />
            </div>

            <label htmlFor="regione" className="labelTitle">Regione</label>
            <div className="region-buttons">
              {regioni.map(reg => (
                <button
                  key={reg}
                  type="button"
                  className={`region-button ${regione === reg ? 'selected' : ''}`}
                  onClick={() => setRegione(reg)}
                  disabled={fieldsDisabled}
                >
                  {reg}
                </button>
              ))}
            </div>

            <label htmlFor="provincia" className="labelTitle">Provincia</label>
            <select id="provincia" className="noBorderSelect" value={provincia} onChange={e => setProvincia(e.target.value)} required disabled={!provinceList.length || fieldsDisabled}>
              <option value="">Scegli</option>
              {provinceList.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <label htmlFor="comune" className="labelTitle">Comune</label>
            <select id="comune" className="noBorderSelect" value={comune} onChange={e => setComune(e.target.value)} required disabled={!comuniList.length || fieldsDisabled}>
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
                  disabled={fieldsDisabled}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}