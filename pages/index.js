import { useEffect } from 'react';
import { connectToDatabase } from '../lib/mongodb';
import Head from 'next/head';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import MenuVino from './genera-carta-vino';
import { loadGoogleAnalytics } from '../lib/gtag';

export async function getServerSideProps() {
  const { db } = await connectToDatabase();
  const now = new Date();

  // Prossime degustazioni
  const prossime = await db
    .collection('degustazioni')
    .find({ data: { $gte: now } })
    .sort({ data: 1 })
    .toArray();

  // Degustazioni passate
  const passate = await db
    .collection('degustazioni')
    .find({ data: { $lt: now } })
    .sort({ data: -1 })
    .toArray();

  return {
    props: {
      prossime: JSON.parse(JSON.stringify(prossime)),
      passate: JSON.parse(JSON.stringify(passate)),
    },
  };
}


export default function Home({ prossime, passate }) {
  useEffect(() => {
    loadGoogleAnalytics();
  }, []);

  function handleCheckout(link) {
    if (typeof window !== 'undefined' && link) {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  }
  
  return (
    <>
      <Head>
        <title>Enoteca Morbin | Vino, birra e spirits a Trieste</title>
      </Head>

      <Header />
      <div className="container">
        {/* Immagine full width */}
        <img
          src="/enoteca morbin locale.jpg"
          alt="Immagine di copertura"
          className="fullWidthImage"
        />

        {/* Titolo e introduzione */}
        <div className="introduction">
          <h2 className="homeTitle">Le nostre degustazioni</h2>
          <h3 className="homeSubTitle">Scopri le nostre degustazioni e prenota il tuo posto!</h3>
        </div>

        {/* Lista delle degustazioni */}
        <div className="degustazioniList">
          {prossime.map((degustazione) => (
            <div key={degustazione._id} className="degustazioneCard">
              <div className="degustazioneBody">
                <h2 className="degustazioneTitle">{degustazione.titolo}</h2>
                <h3 className="infoValue">
                  {degustazione.data
                    ? new Date(degustazione.data).toLocaleDateString('it-IT')
                    : 'Data non disponibile'}
                  &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;19.00 - 21.00 &nbsp;&nbsp;&nbsp;
                  {degustazione.ora ? degustazione.ora : ''}
                  <br />
                  In Enoteca Morbin -{' '}
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Via+Bramante+8,+Trieste"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Via Bramante 8 - Trieste
                  </a>
                </h3>
                <p className="infoValue"></p>
                <p
                  className="degustazioneCollaborazione"
                  dangerouslySetInnerHTML={{
                    __html: degustazione.descrizione
                      ? degustazione.descrizione.replace(/\n/g, '<br/>')
                      : '',
                  }}
                ></p>
              </div>
              <div className="degustazioneButtons" style={{ position: 'relative' }}>
                <button
                  onClick={degustazione.postiDisponibili > 0 ? () => handleCheckout(degustazione.link) : null}
                  className="customBuyButton"
                  disabled={degustazione.postiDisponibili === 0}
                >
                  {degustazione.postiDisponibili > 0 ? 'Prenota ora' : 'Posti esauriti'}
                </button>
                <button
                  onClick={() => (window.location.href = `/degustazioni/${degustazione.slug}`)}
                  className="customBuyButton"
                >
                  Scopri di più
                </button>
                <button
                  onClick={() => (window.location.href = `tel:3454593929`)}
                  className="customBuyButton"
                >
                  Chiamaci
                </button>
              </div>
            </div>
          ))}
        </div>



        <div className="SectionGrey">
          <h2 className="singleSlugTitle white-text">Le degustazioni<br />passate</h2>
        </div>

        {/* Lista delle degustazioni passate */}
        <div className="degustazioniList">
          {passate.map((degustazione) => (
            <div key={degustazione._id} className="degustazioneCard">
              <div className="degustazioneBody">
                <h2 className="degustazioneTitle">{degustazione.titolo}</h2>
                <h3 className="infoValue">
                  {degustazione.data
                    ? new Date(degustazione.data).toLocaleDateString('it-IT')
                    : 'Data non disponibile'}
                  &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;19.00 - 21.00 &nbsp;&nbsp;&nbsp;
                  {degustazione.ora ? degustazione.ora : ''}
                  <br />
                  In Enoteca Morbin -{' '}
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Via+Bramante+8,+Trieste"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Via Bramante 8 - Trieste
                  </a>
                </h3>
                <p className="infoValue"></p>
                <p
                  className="degustazioneCollaborazione"
                  dangerouslySetInnerHTML={{
                    __html: degustazione.descrizione
                      ? degustazione.descrizione.replace(/\n/g, '<br/>')
                      : '',
                  }}
                ></p>
              </div>
              <div className="degustazioneButtons" style={{ position: 'relative' }}>
                <button
                  onClick={() => (window.location.href = `/degustazioni/${degustazione.slug}`)}
                  className="customBuyButton"
                >
                  Scopri di più
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
      <Footer />
    </>
  );
}
