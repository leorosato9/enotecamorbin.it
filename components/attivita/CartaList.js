import React, { memo } from 'react';
import Link from 'next/link';
import CartaItem from './CartaItem';

function CartaList({ carte }) {
  return (
    <div>
      <h2>Carte Vini Generate</h2>
      {carte && carte.length > 0 ? (
        <div className="lista-carte-vini">
          {carte.map(carta => (
            <CartaItem key={carta._id} carta={carta} />
          ))}
        </div>
      ) : (
        <p>Nessuna carta dei vini è stata ancora generata per questa attività.</p>
      )}

      <div className="carta-vini-item new-carta-button" style={{ marginTop: '1rem' }}>
        <Link href="/genera-carta-vino" legacyBehavior>
          <a>
            <strong>+ Genera nuova carta vino</strong>
          </a>
        </Link>
      </div>
    </div>
  );
}

export default memo(CartaList);
