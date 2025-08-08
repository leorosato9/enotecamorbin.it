import Link from 'next/link';
import React, { memo } from 'react';

function CartaItem({ carta }) {
  if (!carta) {
    return null;
  }
  
  const dataFormattata = new Date(carta.createdAt).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="carta-vini-item">
      <Link href={`/carta-vino/${carta._id}`} legacyBehavior>
        <a>
          <span>Carta generata il:</span>
          <strong>{dataFormattata}</strong>
        </a>
      </Link>
    </div>
  );
}

export default memo(CartaItem);
