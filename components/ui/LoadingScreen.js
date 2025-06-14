import { useState, useEffect } from 'react';

export default function LoadingScreen() {
const frasi = [
  "Stiamo selezionando i vini più in sintonia con i piatti del tuo menù...",
  "Lo sapevi che una carta vini ben studiata può aumentare lo scontrino medio fino al 20%?",
  "Stiamo confrontando sapori e profumi per individuare gli abbinamenti ottimali...",
  "Lo sapevi che molti clienti giudicano la qualità di un ristorante anche dalla cura della sua carta dei vini?",
  "Ogni portata viene analizzata per suggerire la bottiglia perfetta...",
  "Lo sapevi che l'abbinamento giusto non solo esalta il vino, ma trasforma la percezione di un piatto, fidelizzando il cliente?",
  "Stiamo calibrando temperatura di servizio e tipologia di bicchiere per ciascun vino...",
  "Il motore enogastronomico sta valutando le caratteristiche uniche del tuo locale...",
  "Lo sapevi che una descrizione curata del vino sulla carta ne aumenta drasticamente l'attrattiva e le vendite?",
  "A breve potrai visionare una carta vini disegnata su misura per il tuo menù...",
  "Il processo di matching tra le tue ricette e i vitigni migliori è in corso...",
  "Lo sapevi che una lista più corta e ben ragionata spesso vende di più di un'enciclopedia di etichette?",
  "Stiamo definendo le etichette da inserire per garantire coerenza e qualità...",
  "Il calcolo degli abbinamenti sta procedendo in tempo reale, basato sui tuoi dati...",
  "Lo sapevi che la tua carta dei vini può raccontare una storia, parlando dei produttori locali e della filosofia della tua cucina?",
  "Stiamo ottimizzando la disposizione dei vini nella carta per una lettura immediata...",
  "L’analisi degli ingredienti dei tuoi piatti è quasi completata...",
  "Stiamo finalizzando la selezione dei vitigni più adatti al tuo stile di cucina...",
  "Il sistema è al lavoro per creare una proposta elegante e funzionale...",
  "Il tuo nuovo sommario dei vini sarà pronto tra pochissimo...",
  "Presto potrai offrire alla tua clientela un’esperienza enogastronomica perfettamente bilanciata."
];

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [step, setStep]               = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setPhraseIndex(i => (i + 1) % frasi.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep(s => (s + 1) % 4);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="loadingOverlay">
      <img src="/logo.webp" alt="Logo" className="logoImage" />

      <p key={phraseIndex} className="waitingP fadeText">
        {frasi[phraseIndex]}
      </p>

      <div className="iconBar">
        {["/restaurant.png","/food-tray.png","/glass-of-wine.png"].map((src, idx) => (
          <img
            key={idx}
            src={src}
            alt=""
            className={`icon ${idx < step ? "active" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
