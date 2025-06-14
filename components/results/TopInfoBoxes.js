export default function TopInfoBoxes({ ristorante, onViewMenu }) {

  if (!ristorante) {
    return null;
  }

  return (
    <div className="topBoxes">
      <div className="menuResults">
        <div className="content">
          <p className="dropZone__main-text">Menù</p>
          <p className="dropZone__sub-text">Il menu del tuo ristorante</p>
        </div>
        <div className="foot">
          <button 
            type="button" 
            className="customBuyButton littleButton" 
            onClick={onViewMenu}
          >
            Visualizza
          </button>
        </div>
      </div>

      <div className="menuResults">
        <div className="content">
          <p className="dropZone__main-text">Ristorante</p>
          <p className="dropZone__sub-text">Informazioni della tua attività</p>
        </div>
        <div className="foot">
          <button 
            type="button" 
            className="customBuyButton littleButton" 
            onClick={() => { alert('Funzionalità da implementare'); }}
          >
            Visualizza
          </button>
        </div>
      </div>
    </div>
  );
}
