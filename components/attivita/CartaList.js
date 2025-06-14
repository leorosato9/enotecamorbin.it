import React, { memo } from 'react';
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
    </div>
  );
}

export default memo(CartaList);