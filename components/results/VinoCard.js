import React from 'react';
import { inflateAffinity } from '../../utils/affinity';

export default function VinoCard({
  vino,
  expl,
  isOpen,
  toggle,
  getDotColor,
  isSelected,
  onSelectionChange
}) {
  const { metadata = {}, categoria } = vino;
  const produttore    = metadata.produttore   || '';
  const denominazione = metadata.denominazione || '';
  const annata        = metadata.annata        || '';

  const formattedName = produttore && denominazione
    ? `${produttore} – ${denominazione}${annata ? ` ${annata}` : ''}`
    : metadata.nome_completo || metadata.nomeVino || 'Nome non disponibile';

  const prezzo = metadata.prezzo ? `€ ${metadata.prezzo}` : '—';
  const percentuale = inflateAffinity(vino.score, 'cosine');

  const explanationArray = Array.isArray(expl.explanation)
    ? expl.explanation
    : Array.isArray(expl.explanations)
      ? expl.explanations
      : [];

  const handleCheckboxClick = e => {
    e.stopPropagation();
    onSelectionChange();
  };

  return (
    <div className="vinoCard">
      <div className="vinoHeader" onClick={toggle}>
        <div className="vinoCardRow">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxClick}
            onClick={e => e.stopPropagation()}
            className="vinoCardCheckbox"
          />
          <div className="vinoTitleAndIcon">
            <div className="vinoTitleRow">{formattedName}</div>
            <img 
              src="/down.png" 
              alt="Espandi" 
              className={`vinoArrow ${isOpen ? 'open' : ''}`} 
            />
          </div>
        </div>

        <div className="vinoMetaRow">
          <span className="vinoScoreWithDot">
            <span 
              className="vinoCategoriaDot" 
              style={{ backgroundColor: getDotColor(categoria) }}
            />
            <span className="vinoScore">{percentuale}%</span>
          </span>
          <span className="vinoPrice">{prezzo}</span>
        </div>
      </div>

      <div className={`vinoDetails ${isOpen ? 'open' : ''}`}>
        <div className="vinoDetailsInner">
          {prezzo && <p><strong>Prezzo medio rivendita:</strong> {prezzo}</p>}
          {categoria && <p><strong>Categoria:</strong> {categoria}</p>}

          {expl.bullets && expl.bullets.length > 0 && (
            <div className="vinoBullets">
              {expl.bullets.map((b, bi) => (
                <div key={bi}>• {b}</div>
              ))} 

              
            </div>
          )}

          {explanationArray.map((linea, idx) => (
            typeof linea === 'string' && (
              <p key={idx} className="vinoDeepDive">{linea}</p>
            )
          ))}
        </div>
      </div>
    </div>
  );
}
