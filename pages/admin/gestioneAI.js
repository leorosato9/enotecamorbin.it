import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { connectToDatabase } from '../../lib/mongodb';
import { getTotalCost } from '../../lib/services/admin/openaiUsage';
import dynamic from 'next/dynamic';
import Header from '../../components/layout/Header';
import { regioni } from '../../data/locations';

const UsersTable       = dynamic(() => import('../../components/admin/UsersTable'),     { ssr: false });
const RestaurantsTable = dynamic(() => import('../../components/admin/RestaurantsTable'), { ssr: false });
const WineCardsChart   = dynamic(() => import('../../components/admin/WineCardsChart'),   { ssr: false });
const ErrorLogsTable   = dynamic(() => import('../../components/admin/ErrorLogsTable'),   { ssr: false });

export default function GestioneAI({
  costSoFar = 0,
  users = [],
  activePlusCount = 0,
  restaurants = [],
  cardsByDay = [],
  cardsList = [],
  logs = [],
  avgRegenerations = 0,
  avgGenSec = 0
}) {
  // filtro regione
  const [filterRegion, setFilterRegion] = useState('');
  // data range per grafico
  const [startDate, setStartDate]       = useState('');
  const [endDate, setEndDate]           = useState('');
  const [chartData, setChartData]       = useState(cardsByDay);

  // paginazione utenti
  const [usersPage, setUsersPage]       = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10);

  // aggiorna grafico quando cambiano le date
  useEffect(() => {
    if (!startDate || !endDate) return;
    (async () => {
      const res = await fetch(`/api/admin/cardsByRange?start=${startDate}&end=${endDate}`);
      if (res.ok) {
        const json = await res.json();
        setChartData(json.data);
      }
    })();
  }, [startDate, endDate]);

  // percentuale plus senza decimali
  const plusPct = users.length
    ? Math.round((activePlusCount / users.length) * 100)
    : 0;

  // report veloci
  const cards = [
    ['Carte Vini',         cardsList.length],
    ['Ristoranti',         restaurants.length],
    ['Utenti',             users.length],
    ['Plus',               `${activePlusCount} (${plusPct}%)`],
    ['Rigenerazioni medie', avgRegenerations.toFixed(1)],
    ['Tempo medio gen.',   `${avgGenSec} s`],
    ['Spesa AI (mese)',    `€${Math.round(costSoFar)}`]
  ];
  const cols = Math.ceil(cards.length / 2);

  // utenti filtrati tramite paginazione
  const pagedUsers = users.slice(
    (usersPage - 1) * usersPerPage,
    usersPage * usersPerPage
  );
  const totalUserPages = Math.ceil(users.length / usersPerPage);

  // ristoranti filtrati
  const filteredRistos = filterRegion
    ? restaurants.filter(r => r.regione === filterRegion)
    : restaurants;

  return (
    <>
      <Head><title>Gestione AI | Admin</title></Head>
      <Header />

      <div className="scheda">
        <h1>Dashboard Amministrativa</h1>

        {/* numeri veloci */}
        <div
          className="summary-cards"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {cards.map(([title, value]) => (
            <div key={title} className="summary-card">
              <h2>{title}</h2>
              <p>{value}</p>
            </div>
          ))}
        </div>

        {/* Utenti registrati con select per paginazione */}
        <section style={{ marginBottom: '3rem' }}>
          <div style={{
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
            marginBottom:   '1rem'
          }}>
            <h2 style={{ margin: 0 }}>Utenti Registrati</h2>
            <div>
              <label style={{ marginRight: '1rem' }}>
                <select
                  value={usersPerPage}
                  onChange={e => {
                    setUsersPerPage(Number(e.target.value));
                    setUsersPage(1);
                  }}
                >
                  {[5,10,15,20,50,100].map(n => (
                    <option key={n} value={n}>Mostra {n}</option>
                  ))}
                </select>{' '}
              </label>
            </div>
          </div>

          <UsersTable data={pagedUsers} />

          {/* controlli paginazione */}
          <div style={{
            display:        'flex',
            justifyContent: 'flex-end',
            gap:            '0.5rem',
            marginTop:      '1rem'
          }}>
            <button
              onClick={() => setUsersPage(p => Math.max(p-1,1))}
              disabled={usersPage === 1}
            >
              «
            </button>
            <span>{usersPage} di {totalUserPages}</span>
            <button
              onClick={() => setUsersPage(p => Math.min(p+1, totalUserPages))}
              disabled={usersPage === totalUserPages}
            >
              »
            </button>
          </div>
        </section>

        <section style={{ margin: '3rem 0' }}>
          <div style={{
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
            marginBottom:   '1rem'
          }}>
            <h2 style={{ margin: 0 }}>Ristoranti</h2>
            <select
              value={filterRegion}
              onChange={e => setFilterRegion(e.target.value)}
              className="selectFilter"
              style={{ minWidth: '100px' }}
            >
              <option value="">Filtra per regione</option>
              {regioni.map(reg => (
                <option key={reg} value={reg}>{reg}</option>
              ))}
            </select>
          </div>
          <RestaurantsTable data={filteredRistos} />
        </section>

        {/* Grafico con date-range */}
        <section style={{ marginBottom: '3rem' }}>
          <div style={{
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
            marginBottom:   '1rem'
          }}>
            <h2 style={{ margin: 0 }}>Carte Vini – Andamento</h2>
            <div>
              <label style={{ marginRight: '0.5rem' }}>
                Da{' '}
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{ width: '150px' }}
                />
              </label>
              <label>
                a{' '}
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{ width: '150px' }}
                />
              </label>
            </div>
          </div>
          <WineCardsChart data={chartData} />
        </section>

        {/* Log errori */}
        <section style={{ marginBottom: '3rem' }}>
          <h2>Log Errori</h2>
          <ErrorLogsTable data={logs} />
        </section>
      </div>
    </>
  );
}

export async function getServerSideProps() {
  const { db } = await connectToDatabase();

  // 1) Spesa AI
  let costSoFar = 0;
  try {
    const today     = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString().slice(0,10);
    const endDate   = today.toISOString().slice(0,10);
    costSoFar = await getTotalCost(startDate, endDate);
  } catch (e) {
    console.error('[GestioneAI] errore costSoFar:', e);
  }

  // 2) Utenti
  const rawUsers = await db.collection('utenti')
    .find({})
    .project({ nome:1, cognome:1, email:1, plan:1, createdAt:1 })
    .toArray();
  const users = rawUsers.map(u => ({
    id:               u._id.toString(),
    nome:             u.nome,
    cognome:          u.cognome,
    email:            u.email,
    subscriptionType: u.plan,
    createdAt:        u.createdAt.toISOString()
  }));
  const activePlusCount = await db.collection('utenti')
    .countDocuments({ plan: 'plus' });

  // 3) Ristoranti
  const rawRisto = await db.collection('attività')
    .find({})
    .project({ nome:1, regione:1, provincia:1, comune:1 })
    .toArray();
  const restaurants = rawRisto.map(r => ({
    id:        r._id.toString(),
    name:      r.nome,
    regione:   r.regione,
    provincia: r.provincia,
    comune:    r.comune
  }));

  // 4) Carte vini
  const rawCards = await db.collection('cartavini')
    .find({})
    .project({ attivitaId:1, createdAt:1, regenerationCount:1, generationTimeMs:1 })
    .toArray();
  const cardsList = rawCards.map(c => ({
    id:         c._id.toString(),
    attivitaId: c.attivitaId.toString(),
    createdAt:  c.createdAt.toISOString(),
    regenCount: c.regenerationCount || 0,
    generationMs: c.generationTimeMs || 0
  }));

  // 5) Log errori
  const rawLogs = await db.collection('logs')
    .find({})
    .project({ level:1, endpoint:1, message:1, timestamp:1 })
    .toArray();
  const logs = rawLogs.map(l => ({
    level:     l.level,
    endpoint:  l.endpoint,
    message:   l.message,
    timestamp: l.timestamp.toISOString()
  }));

  // 6) Carte per giorno
  const cardsByDayAgg = await db.collection('cartavini').aggregate([
    { $group: {
        _id: { year:{$year:'$createdAt'}, month:{$month:'$createdAt'}, day:{$dayOfMonth:'$createdAt'} },
        count:{ $sum:1 }
      }
    },
    { $sort:{ '_id.year':1,'_id.month':1,'_id.day':1 } }
  ]).toArray();
  const cardsByDay = cardsByDayAgg.map(d => ({
    date:  `${String(d._id.day).padStart(2,'0')}/${String(d._id.month).padStart(2,'0')}`,
    count: d.count
  }));

  // 7) Rigenerazioni medie
  const avgRegenAgg = await db.collection('cartavini').aggregate([
    { $group:{ _id:null, avgRegen:{ $avg:'$regenerationCount' } } }
  ]).toArray();
  const avgRegenerations = parseFloat((avgRegenAgg[0]?.avgRegen || 0).toFixed(1));

  // 8) Tempo medio generazione
  const avgGenAgg = await db.collection('cartavini').aggregate([
    { $match: { generationTimeMs: { $exists: true } } },
    { $group:{ _id:null, avgGenMs:{ $avg:'$generationTimeMs' } } }
  ]).toArray();
  const avgGenSec = avgGenAgg[0]
    ? Math.round(avgGenAgg[0].avgGenMs / 1000)
    : 0;

  return {
    props: {
      costSoFar,
      users,
      activePlusCount,
      restaurants,
      cardsByDay,
      cardsList,
      logs,
      avgRegenerations,
      avgGenSec
    }
  };
}
