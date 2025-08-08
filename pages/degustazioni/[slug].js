import { useState, useEffect } from 'react';
import { connectToDatabase } from '../../lib/mongodb';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { loadGoogleAnalytics } from '../../lib/gtag';
import React from 'react';
import { ObjectId } from 'mongodb';
import Link from 'next/link';
import Head from 'next/head';

export async function getServerSideProps(context) {
  const { slug } = context.params;
  const { db } = await connectToDatabase();

  if (!db) {
    return {
      notFound: true,
    };
  }

  // Trova la degustazione corrente
  const degustazione = await db.collection('degustazioni').findOne({ slug });

  if (!degustazione) {
    return {
      notFound: true,
    };
  }

  const now = new Date();

  // Ottieni tutte le degustazioni diverse dalla corrente
  const tutteDegustazioni = await db
    .collection('degustazioni')
    .find({ slug: { $ne: slug } })
    .toArray();

  // Suddividi in "prossime" e "passate"
  const prossimeDegustazioni = tutteDegustazioni
    .filter((deg) => new Date(deg.data) >= now) // Filtra quelle future
    .sort((a, b) => new Date(a.data) - new Date(b.data)); // Ordina per data crescente

  const degustazioniPassate = tutteDegustazioni
    .filter((deg) => new Date(deg.data) < now) // Filtra quelle passate
    .sort((a, b) => new Date(b.data) - new Date(a.data)); // Ordina per data decrescente

  // Serializza i dati per le prossime degustazioni
  const altreDegustazioniSerialized = prossimeDegustazioni.map((deg) => ({
    _id: deg._id.toString(),
    slug: deg.slug,
    titolo: deg.titolo,
    descrizione: deg.descrizione,
    data: deg.data ? new Date(deg.data).toISOString() : null,
    ora: deg.ora || '19:00 > 21.00',
    calici: typeof deg.calici === 'number' ? deg.calici : 0,
    postiDisponibili: deg.postiDisponibili,
    vini: deg.vini || null,
    imagePath: deg.imagePath || null,
    link: deg.link || null,
  }));

  // Serializza i dati per le degustazioni passate
  const degustazioniPassateSerialized = degustazioniPassate.map((deg) => ({
    _id: deg._id.toString(),
    slug: deg.slug,
    titolo: deg.titolo,
    descrizione: deg.descrizione,
    data: deg.data ? new Date(deg.data).toISOString() : null,
    ora: deg.ora || '19:00 > 21.00',
    calici: typeof deg.calici === 'number' ? deg.calici : 0,
    postiDisponibili: deg.postiDisponibili,
    vini: deg.vini || null,
    imagePath: deg.imagePath || null,
    link: deg.link || null,
  }));

  let bottiglie = [];
  if (degustazione.bottiglie && degustazione.bottiglie.length > 0) {
    const bottiglieObjectIds = degustazione.bottiglie.map((id) => new ObjectId(id));

    bottiglie = await db
      .collection('bottiglie')
      .find({ _id: { $in: bottiglieObjectIds } })
      .toArray();

    bottiglie = bottiglie.map((bottiglia) => ({
      ...bottiglia,
      _id: bottiglia._id.toString(),
      createdAt: bottiglia.createdAt ? bottiglia.createdAt.toISOString() : null,
      updatedAt: bottiglia.updatedAt ? bottiglia.updatedAt.toISOString() : null,
    }));
  }

  return {
    props: {
      degustazione: {
        id: degustazione._id.toString(),
        titolo: degustazione.titolo,
        descrizione: degustazione.descrizione,
        data: degustazione.data ? new Date(degustazione.data).toISOString() : null,
        calici: degustazione.calici ? degustazione.calici : null,
        postiDisponibili: degustazione.postiDisponibili,
        iscrizioniAttuali: degustazione.iscrizioniAttuali || 0,
        imagePath: degustazione.imagePath || null,
        ora: degustazione.ora || '19:00 > 21.00',
        bottiglie,
        slug: degustazione.slug,
        link: degustazione.link || null,
      },
      altreDegustazioni: altreDegustazioniSerialized, // Prossime degustazioni
      degustazioniPassate: degustazioniPassateSerialized, // Degustazioni passate
    },
  };
}

export default function DettaglioDegustazione({ degustazione, altreDegustazioni, degustazioniPassate }) {
  const [currentBottigliaIndex, setCurrentBottigliaIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [fadeClass, setFadeClass] = useState('fadeIn');

  useEffect(() => {
    loadGoogleAnalytics();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBottigliaIndex((prevIndex) =>
        prevIndex === degustazione.bottiglie.length - 1 ? 0 : prevIndex + 1
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [degustazione.bottiglie.length]);

  const handlePrevious = () => {
    if (isMobile) {
      setFadeClass('fadeOut');
      setTimeout(() => {
        setCurrentBottigliaIndex((prevIndex) =>
          prevIndex === 0 ? degustazione.bottiglie.length - 1 : prevIndex - 1
        );
        setFadeClass('fadeIn');
      }, 500);
    }
  };

  const handleNext = () => {
    if (isMobile) {
      setFadeClass('fadeOut');
      setTimeout(() => {
        setCurrentBottigliaIndex((prevIndex) =>
          prevIndex === degustazione.bottiglie.length - 1 ? 0 : prevIndex + 1
        );
        setFadeClass('fadeIn');
      }, 500);
    }
  };

  const currentBottiglia = degustazione.bottiglie[currentBottigliaIndex];

  function handleCheckout() {
    if (typeof window !== 'undefined' && degustazione.link) {
      window.open(degustazione.link, '_blank', 'noopener,noreferrer');
    }
  }

  const isSoldOut = degustazione.postiDisponibili === 0;

  return (
    <>
      <Head>
        <title>{degustazione.titolo} - Enoteca Morbin</title>
        <meta name="description" content={degustazione.descrizione} />

        {/* Meta Pixel Code */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window,document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '2818059681835213'); 
              fbq('track', 'PageView');
            `,
          }}
        />
        <noscript>
          <img height="1" width="1" src="https://www.facebook.com/tr?id=2818059681835213&ev=PageView&noscript=1"/>
        </noscript>
        {/* End Meta Pixel Code */}
      </Head>

      <Header />

      <div className="imageWrapper">
        {degustazione.imagePath && (
          <img
            src={`/images/${degustazione.imagePath}`}
            alt="Immagine di copertura"
            className="fullWidthImage slugImage"
          />
        )}
        <h1 className="h1 slugTitle">{degustazione.titolo}</h1>
      </div>

      <div className="container">
        <div className="infoContainer">
          <div className="infoItem">
            <img src={`/calendar.png`} alt="Data" className="iconDeg" />
            <span className="infoValue">
              {degustazione.data
                ? new Date(degustazione.data).toLocaleDateString('it-IT')
                : 'Data non Disponibile'}
            </span>
          </div>

          <div className="infoItem">
            <img src={`/clock.png`} alt="Ora" className="iconDeg" />
            <span className="infoValue">{degustazione.ora}</span>
          </div>

          <div className="infoItem">
            <img src={`/dollar.png`} alt="Prezzo" className="iconDeg" />
            <span className="infoValue">35€</span>
          </div>

          <div className="infoItem">
            <img src={`/location.png`} alt="Luogo" className="iconDeg" />
            <a
              href="https://www.google.com/maps/search/?api=1&query=Via+Bramante+8,+Trieste"
              target="_blank"
              rel="noopener noreferrer"
              className="infoValue"
            >
              Enoteca Morbin - Via Bramante 8/B - Trieste
            </a>
          </div>

          <div className="infoItem">
            <img src={`/calice.png`} alt="Calice" className="iconDeg" />
            <span className="infoValue">
              {degustazione.calici}
            </span>
          </div>
        </div>

        <div className="contentWithButtons">
          <div className="slugDescription">
            <p>{degustazione.descrizione}</p>
          </div>

          {!isSoldOut && (
            <div className="slugButtonSection">
            {!isSoldOut && (
              <>
                <button
                  onClick={!isSoldOut ? handleCheckout : null}
                  className={`customBuyButton slugButton${isSoldOut ? 'soldOutButton' : ''}`}
                  disabled={isSoldOut}
                >
                  Prenota ora
                </button>
                <a
                  href="tel:+393454593929" // Numero di telefono dell'enoteca
                  className="customBuyButton slugButton"
                >
                  Chiamaci
                </a>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: degustazione.titolo,
                        text: 'Scopri questa degustazione!',
                        url: window.location.href,
                      });
                    } else {
                      alert('Condivisione non supportata sul tuo dispositivo.');
                    }
                  }}
                  className="customBuyButton slugButton"
                >
                  Condividi
                </button>
              </>
            )}
          </div>

          )}
        </div>

        <h2 className="singleSlugTitle">Quali vini degusteremo?</h2>

        {degustazione.bottiglie && degustazione.bottiglie.length > 0 && (
          <div className="viniSection">
            {isMobile ? (
              <div>
                {currentBottiglia && (
                  <div className={`vinoItem ${fadeClass}`} key={currentBottiglia._id}>
                    {currentBottiglia.foto && (
                      <img
                        src={currentBottiglia.foto}
                        alt={currentBottiglia.nome || 'Vino'}
                        className="vinoImage"
                      />
                    )}
                    {currentBottiglia.cantina && <h2 className="NomeCantina">{currentBottiglia.cantina}</h2>}
                    {currentBottiglia.nome && <h2 className="NomeEtichetta">{currentBottiglia.nome}</h2>}
                  </div>
                )}
              </div>
            ) : (
              <div className="bottiglieContainer">
                {degustazione.bottiglie.map((bottiglia) => (
                  <div className="vinoItem" key={bottiglia._id}>
                    {bottiglia.foto && (
                      <img
                        src={bottiglia.foto}
                        alt={bottiglia.nome || 'Vino'}
                        className="vinoImage"
                      />
                    )}
                    {bottiglia.cantina && <h2 className="NomeCantina">{bottiglia.cantina}</h2>}
                    {bottiglia.nome && <h2 className="NomeEtichetta">{bottiglia.nome}</h2>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="SectionGrey">
          <h2 className="singleSlugTitle white-text">
            {altreDegustazioni && altreDegustazioni.length > 0 ? (
              <>
                Le prossime <br /> degustazioni
              </>
            ) : (
              <>
                Le degustazioni <br /> passate
              </>
            )}
          </h2>
        </div>
      </div>

      <Footer />
    </>
  );
}
