import { useState } from 'react';
import Link from 'next/link';

export default function ActivityItem({ activity, currentUserEmail, emailToName }) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const handleInvite = async () => {
    const inviteeEmail = (inviteEmail || '').trim().toLowerCase();
    if (!inviteeEmail) {
      return alert('Inserisci un’email valida.');
    }
    setIsInviting(true);
    try {
      const response = await fetch('/api/invite', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId: activity._id,
          activityName: activity.nome,
          inviteeEmail,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Errore sconosciuto');
      }
      alert('Invito inviato con successo a ' + inviteeEmail);
      setInviteEmail('');
    } catch (err) {
      console.error('Errore invio invito:', err);
      alert(err.message);
    } finally {
      setIsInviting(false);
    }
  };

  const isOwner = activity.userEmail === currentUserEmail;

  const linkStyle = {
    display: 'block',
    color: 'inherit',
    textDecoration: 'none',
    cursor: 'pointer'
  };

  return (
    <Link href={`/attivita/${activity._id}`} passHref legacyBehavior>
      <a style={linkStyle}>
        <div className="attivita">
          <h3>{activity.nome}</h3>
          <p>
            {activity.comune}, {activity.provincia}, {activity.regione}
          </p>
          <p>
            <strong>Creato il:</strong>{' '}
            {new Date(activity.createdAt).toLocaleDateString('it-IT', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </p>
          <p>
            <strong>Proprietario:</strong> {activity.userEmail}
          </p>
          <p>
            <strong>Collaboratori:</strong>{' '}
            {activity.collaboratori && activity.collaboratori.length > 0
              ? activity.collaboratori
                  .map((email) => (emailToName[email] ? emailToName[email] : email))
                  .join(', ')
              : 'Nessuno'}
          </p>

          {isOwner && (
            <div onClick={(e) => e.stopPropagation()}>
              <h4>Invita un collaboratore</h4>
              <div>
                <input
                  className="inputButton"
                  type="email"
                  placeholder="Email del collaboratore"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={isInviting}
                />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleInvite();
                  }}
                  className="customBuyButton slugButton"
                  disabled={isInviting}
                >
                  {isInviting ? 'Invio...' : 'Invita a collaborare'}
                </button>
              </div>
            </div>
          )}
        </div>
      </a>
    </Link>
  );
}
