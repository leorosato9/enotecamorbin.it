export default function VinoCard({ vino, expl, isOpen, toggle, getDotColor, isSelected, onSelectionChange }) {

  const { metadata = {}, categoria } = vino;
  const produttore = metadata.produttore || '';
  const denominazione = metadata.denominazione || '';
  const annata = metadata.annata || '';
  
  const formattedName = produttore && denominazione
    ? `${produttore} – ${denominazione}${annata ? ` ${annata}` : ''}`
    : metadata.nome_completo || metadata.nomeVino || 'Nome non disponibile';
    
  const prezzo = metadata.prezzo ? `€ ${metadata.prezzo}` : '—';

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    onSelectionChange();
  };

  return (
    <div className="vinoCard">
      <div className="vinoHeader" onClick={toggle}>
        <div className="vinoTitleAndIcon">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxClick}
            onClick={(e) => e.stopPropagation()} 
            className="resultsCheck"
          />
          <div className="vinoTitleRow">{formattedName}</div>
          <img src="/down.png" alt="Espandi" className={`vinoArrow ${isOpen ? 'open' : ''}`} />
        </div>
        <div className="vinoMetaRow">
          <span className="vinoScoreWithDot">
            <span className="vinoCategoriaDot" style={{ backgroundColor: getDotColor(categoria) }}></span>
            <span className="vinoScore">{(vino.score * 100).toFixed(0)}%</span>
          </span>
          <span className="vinoPrice">{prezzo}</span>
        </div>
      </div>

      <div className={`vinoDetails ${isOpen ? 'open' : ''}`}>
        <div className="vinoDetailsInner">
          {categoria && <p><strong>Categoria:</strong> {categoria}</p>}
          {expl.bullets.length > 0 && (
            <div>
              {expl.bullets.map((b, bi) => <div key={bi}>• {b}</div>)}
            </div>
          )}
          <p>{expl.explanation}</p>
        </div>
      </div>
    </div>
  );
}