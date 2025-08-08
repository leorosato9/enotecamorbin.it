import React from 'react'
import { useRouter } from 'next/router'

export default function TopInfoBoxes({ ristorante, onViewMenu }) {
  const router = useRouter()

  if (!ristorante) return null

  const handleViewInfo = () => {
    if (ristorante.attivitaId) {
      router.push(`/attivita/${ristorante.attivitaId}`);
    }
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
            onClick={handleViewInfo}
          >
            Visualizza
          </button>
        </div>
      </div>
    </div>
  )
}
