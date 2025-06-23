import { useState } from 'react';
import { useLocationLogic } from '../../hooks/genera-carta-vino/useLocationLogic';
import { regioni } from '../../data/locations';

export default function ActivityForm({ onSubmit, isSubmitting, error }) {
  const [nomeAtt, setNomeAtt] = useState('');
  const [fascia, setFascia] = useState(''); 

  const {
    regione, setRegione,
    provincia, setProvincia,
    comune, setComune,
    provinceList,
    comuniList,
  } = useLocationLogic();

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const success = await onSubmit({
      nome: nomeAtt,
      regione,
      provincia,
      comune,
      fascia 
    });
    
    if (success) {
      setNomeAtt('');
      setRegione('');
      setProvincia('');
      setComune('');
      setFascia('');
    }
  };

  const isLimitError = error && error.includes('Hai raggiunto il limite');
  
  const shouldDisableForm = isSubmitting || isLimitError;

  return (
    <div>
      <h2>Aggiungi la tua attività</h2>
      <form onSubmit={handleFormSubmit}>
        {isLimitError && (
          <div className="error-message-box">
            <p>{error}</p>
          </div>
        )}

        {!isLimitError && (
          <>
            <div>
              <label><strong>Nome:</strong><br />
                <input
                  type="text"
                  value={nomeAtt}
                  onChange={(e) => setNomeAtt(e.target.value)}
                  className="halfInput"
                  disabled={shouldDisableForm}
                />
              </label>
            </div>
            <div className="form-row">
              <div>
                <label><strong>Regione:</strong><br />
                  <select value={regione} onChange={(e) => setRegione(e.target.value)} disabled={shouldDisableForm}>
                    <option value="">Seleziona regione</option>
                    {regioni.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
              </div>
              <div>
                <label><strong>Provincia:</strong><br />
                  <select value={provincia} onChange={(e) => setProvincia(e.target.value)} disabled={!provinceList.length || shouldDisableForm}>
                    <option value="">Seleziona provincia</option>
                    {provinceList.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
              </div>
            </div>
            <div className="form-row">
              <div>
                <label><strong>Comune:</strong><br />
                  <select value={comune} onChange={(e) => setComune(e.target.value)} disabled={!comuniList.length || shouldDisableForm}>
                    <option value="">Seleziona comune</option>
                    {comuniList.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              </div>
            </div>
            
            <div>
                <label className="labelTitle"><strong>Fascia di prezzo:</strong></label>
                <div className="fascia-buttons">
                    {['€', '€€', '€€€', '€€€€', '€€€€€'].map(sym => (
                    <button
                        key={sym}
                        type="button"
                        onClick={() => setFascia(sym)}
                        className={`customBuyButton ${fascia === sym ? 'selected' : ''}`}
                        disabled={shouldDisableForm}
                    >
                        {sym}
                    </button>
                    ))}
                </div>
            </div>

            
            <button type="submit" disabled={shouldDisableForm} className="customBuyButton slugButton">
              {isSubmitting ? 'Salvataggio…' : 'Aggiungi Attività'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}