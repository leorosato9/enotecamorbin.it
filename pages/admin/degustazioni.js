import { useState } from 'react';
import { connectToDatabase } from '../../lib/mongodb';
import Head from 'next/head';

export async function getServerSideProps() {
  const { db } = await connectToDatabase();

  const degustazioni = await db.collection('degustazioni').find().toArray();

  const serializedDegustazioni = degustazioni.map((degustazione) => ({
    id: degustazione._id.toString(),
    slug: degustazione.slug,
    titolo: degustazione.titolo,
    descrizione: degustazione.descrizione,
    data: degustazione.data ? degustazione.data.toISOString() : null,
    calici: degustazione.calici || null,
    postiDisponibili: degustazione.postiDisponibili,
    dettagli: degustazione.dettagli || '',
    cicchetto: degustazione.cicchetto || false,
  }));

  return {
    props: {
      initialDegustazioni: serializedDegustazioni,
    },
  };
}

export default function Degustazioni({ initialDegustazioni }) {
  const [degustazioni, setDegustazioni] = useState(initialDegustazioni);

  return (
    <>
      <Head>
        <title>Enoteca Morbin | Admin - Gestione degustazioni</title>
      </Head>

      <div className="scheda">
        <h1 className="styles.title">Gestione Degustazioni</h1>
        <div className="styles.degustazioniList">
          {degustazioni.map((degustazione) => (
            <div key={degustazione.id} className="styles.degustazioneItem">
              <h3>{degustazione.titolo}</h3>
              <p>
                Data: {degustazione.data ? new Date(degustazione.data).toLocaleDateString() : 'Non disponibile'}
              </p>
              <p>Posti Disponibili: {degustazione.postiDisponibili}</p>
              <p>{degustazione.descrizione}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
