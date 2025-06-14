import React from 'react';

export default function PendingInvitations({ invites, isLoading, error, onRespond }) {
  const renderContent = () => {
    if (isLoading) {
      return <p>Caricamento inviti…</p>;
    }
    if (error) {
      return <p style={{ color: 'red' }}>{error}</p>;
    }
    if (invites.length === 0) {
      return <p>Non hai richieste di collaborazione in sospeso.</p>;
    }

    return (
      <div className="attivita">
        {invites.map((inv) => (
          <div key={inv._id} style={{ marginBottom: '1rem' }}>
            <p>
              <strong>Attività:</strong> {inv.activityName}
            </p>
            <p>
              <strong>Invitato da:</strong> {inv.inviterEmail}
            </p>
            <div>
              <button
                onClick={() => onRespond(inv._id, 'accept')}
                className="customBuyButton slugButton"
              >
                Accetta
              </button>
              <button
                onClick={() => onRespond(inv._id, 'reject')}
                className="customBuyButton slugButton"
              >
                Rifiuta
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <h2>Richieste di collaborazione</h2>
      {renderContent()}
    </div>
  );
}
