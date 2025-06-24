import React from 'react';
import Link from 'next/link';

export default function LimitErrorBox({ error }) {
  
  if (!error) {
    return null;
  }

  return (
    <div className="error-message-box">
      
      <p>{error.message}</p>
      
      {error.payload?.showUpgradeLink && (
        <div>
          <Link href={error.payload.linkHref || '/upgrade'} legacyBehavior>
            <a className="customBuyButton">{error.payload.linkText}</a>
          </Link>
        </div>
      )}
    </div>
  );
}