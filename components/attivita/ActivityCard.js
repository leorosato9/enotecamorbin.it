import React, { memo } from 'react';

function ActivityCard({ attivitaData }) {
  if (!attivitaData) {
    return null;
  }

  const { nome, comune, provincia, regione } = attivitaData;

  return (
    <div className="profileInfo">
      <p>
        <strong>Nome Attività:</strong> {nome}
      </p>
      <p>
        <strong>Località:</strong> {comune}, ({provincia})
      </p>
      <p>
        <strong>Regione:</strong> {regione}
      </p>
    </div>
  );
}

export default memo(ActivityCard);
