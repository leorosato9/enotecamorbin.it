import React from 'react';

export default function UsersTable({ data }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Email</th>
          <th>Abbonamento</th>
          <th>Registrazione</th>
        </tr>
      </thead>
      <tbody>
        {data.map(u => (
          <tr key={u.id}>
            <td>{u.nome} {u.cognome}</td>
            <td>{u.email}</td>
            <td className={u.subscriptionType === 'plus' ? 'subscriptionPlus' : ''}>
              {u.subscriptionType}
            </td>
            <td>{new Date(u.createdAt).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
