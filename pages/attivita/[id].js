import { getSession } from 'next-auth/react';
import { connectToDatabase } from '../../lib/mongodb';
import { ObjectId } from 'mongodb';
import Head from 'next/head';

import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';

import ActivityCard from '../../components/attivita/ActivityCard';
import CartaList from '../../components/attivita/CartaList';

export default function AttivitaDetailPage({ attivitaData, carteViniData }) {
  if (!attivitaData) {
    return (
        <>
            <Head>
                <title>Attività non trovata</title>
            </Head>
            <Header />
            <div className="scheda">
                <h1>Attività non trovata</h1>
                <p>L'attività che stai cercando non esiste o non hai i permessi per vederla.</p>
            </div>
            <Footer />
        </>
    );
  }

  return (
    <>
      <Head>
        <title>{attivitaData.nome} | Dettaglio Attività</title>
      </Head>
      <Header />
      <div className="scheda">
        <h1>{attivitaData.nome}</h1>

        <ActivityCard attivitaData={attivitaData} />

        <hr style={{ margin: '2rem 0' }} />

        <CartaList carte={carteViniData} />
        
      </div>
      <Footer />
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);

  if (!session) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  try {
    const { id } = context.params;
    if (!ObjectId.isValid(id)) {
      return { notFound: true };
    }

    const { db } = await connectToDatabase();
    
    const attivita = await db.collection('attività').findOne({ _id: new ObjectId(id) });

    if (!attivita) {
      return { notFound: true };
    }

    const userEmail = session.user.email.toLowerCase();
    const isOwner = attivita.userEmail === userEmail;
    const isCollaborator = (attivita.collaboratori || []).includes(userEmail);

    if (!isOwner && !isCollaborator) {
      return { notFound: true };
    }

    const carteViniIds = attivita.carteViniIds || [];
    let carteVini = [];

    if (carteViniIds.length > 0) {
      const objectIds = carteViniIds.map(id => {
        try {
          return new ObjectId(id);
        } catch {
          return id; 
        }
      });
      
      carteVini = await db.collection('cartavini').find({ 
        _id: { $in: objectIds } 
      }).sort({ createdAt: -1 }).toArray();
    }

    return {
      props: {
        attivitaData: JSON.parse(JSON.stringify(attivita)),
        carteViniData: JSON.parse(JSON.stringify(carteVini)),
      },
    };

  } catch (e) {
    console.error('Errore in getServerSideProps /attivita/[id]:', e);
    return { notFound: true };
  }
}
