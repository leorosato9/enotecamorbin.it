// components/admin/RestaurantsTable.jsx
import React from 'react';

export default function RestaurantsTable({ data }) {
  if (!data.length) {
    return <p>Nessun ristorante da mostrare.</p>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th className="titoloTabella">Nome</th>
          <th className="titoloTabella">Comune (Provincia)</th>
        </tr>
      </thead>
      <tbody>
        {data.map(r => (
          <tr key={r.id}>
            <td className="contenutoTabella">{r.name}</td>
            <td className="contenutoTabella">
              {r.comune} ({r.provincia})
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
