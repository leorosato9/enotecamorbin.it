// components/user/ProfileCard.js
import React, { memo, useState } from 'react';
import BillingInfo from '../billing/BillingInfo';

function ProfileCard({ userData, onSignOut }) {
  if (!userData) return null;

  const { nome, cognome, email, telefono, plan, createdAt } = userData;
  const [billingProfile, setBillingProfile] = useState(userData.billingProfile || null);

  return (
    <div className="profileInfo">
      <p><strong>Nome:</strong> {nome}</p>
      <p><strong>Cognome:</strong> {cognome}</p>
      <p><strong>Email:</strong> {email}</p>
      <p><strong>Piano:</strong> {plan}</p>
      <p><strong>Telefono:</strong> {telefono}</p>
      <p>
        <strong>Registrato il:</strong>{' '}
        {createdAt
          ? new Date(createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : ''}
      </p>

      <div style={{ marginTop: 24 }}>
        <BillingInfo
          initialBilling={billingProfile}
          onSaved={(bp) => setBillingProfile(bp)}
        />
      </div>

      <button onClick={onSignOut} className="submitButton customBuyButton slugButton">
        Esci
      </button>
    </div>
  );
}

export default memo(ProfileCard);
