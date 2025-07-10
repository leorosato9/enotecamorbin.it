import React from 'react';

export default function ErrorLogsTable({ data }) {
  if (!data || data.length === 0) {
    return <p>Nessun log di errore disponibile.</p>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th className="titoloTabella">Data / Ora</th>
          <th className="titoloTabella">Livello</th>
          <th className="titoloTabella">Endpoint</th>
          <th className="titoloTabella">Messaggio</th>
        </tr>
      </thead>
      <tbody>
        {data.map((log, idx) => (
          <tr key={idx}>
            <td className="contenutoTabella">
              {new Date(log.timestamp).toLocaleString()}
            </td>
            <td className="contenutoTabella">{log.level}</td>
            <td className="contenutoTabella">{log.endpoint}</td>
            <td className="contenutoTabella">{log.message}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
