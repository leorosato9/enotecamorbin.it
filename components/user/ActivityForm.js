import { useState } from 'react';
import { useLocationLogic } from '../../hooks/genera-carta-vino/useLocationLogic';
import { regioni } from '../../data/locations';

export default function ActivityForm({ onSubmit, isSubmitting, error }) {
  const [nomeAtt, setNomeAtt] = useState('');
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
    });
    
    if (success) {
      setNomeAtt('');
      setRegione('');
    }
  };

  return (
    <div>
      <h2>Aggiungi la tua attività</h2>
      <form onSubmit={handleFormSubmit}>
        <div>
          <label><strong>Nome:</strong><br />
            <input
              type="text"
              value={nomeAtt}
              onChange={(e) => setNomeAtt(e.target.value)}
              className="halfInput"
              disabled={isSubmitting}
            />
          </label>
        </div>
        <div className="form-row">
          <div>
            <label><strong>Regione:</strong><br />
              <select value={regione} onChange={(e) => setRegione(e.target.value)} disabled={isSubmitting}>
                <option value="">Seleziona regione</option>
                {regioni.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
          </div>
          <div>
            <label><strong>Provincia:</strong><br />
              <select value={provincia} onChange={(e) => setProvincia(e.target.value)} disabled={!provinceList.length || isSubmitting}>
                <option value="">Seleziona provincia</option>
                {provinceList.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
          </div>
        </div>
        <div className="form-row">
          <div>
            <label><strong>Comune:</strong><br />
              <select value={comune} onChange={(e) => setComune(e.target.value)} disabled={!comuniList.length || isSubmitting}>
                <option value="">Seleziona comune</option>
                {comuniList.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
        </div>
        {error && <p>{error}</p>}
        <button type="submit" disabled={isSubmitting} className="customBuyButton slugButton">
          {isSubmitting ? 'Salvataggio…' : 'Aggiungi Attività'}
        </button>
      </form>
    </div>
  );
}
