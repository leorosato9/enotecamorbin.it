import React, { useState } from 'react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [contenuto, setContenuto] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Funzione per gestire l'invio del form
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !contenuto) {
      setMessage('Per favore, compila tutti i campi.');
      setMessageType('error');
      return;
    }

    setIsSending(true);
    setMessage('');
    setMessageType('');

    try {
      const response = await fetch('/api/formcontatto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, contenuto }),
      });

      if (response.ok) {
        setMessage('Messaggio inviato con successo! Ti risponderemo al più presto!');
        setMessageType('success');
        setEmail('');
        setContenuto('');
      } else {
        setMessage('Errore durante l\'invio del messaggio. Riprova.');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Errore:', error);
      setMessage('Errore di connessione. Riprova più tardi.');
      setMessageType('error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <footer className="footer">
      <div className="footerContent">
        {/* Riga superiore con contactBox e timeBox */}
        <div className="footerTopRow">
          {/* Box di contatto a sinistra */}
          <div className="contactBox">
            <h3 className="whiteh3">Vuoi contattarci?</h3>

            <form className="contactForm" onSubmit={handleSubmit}>
              <label htmlFor="email">Inserisci la tua email:</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Inserisci la tua email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <label htmlFor="contenuto">Dicci cosa vorresti segnalarci:</label>
              <textarea
                id="contenuto"
                name="contenuto"
                placeholder="Dicci cosa vorresti segnalarci"
                value={contenuto}
                onChange={(e) => setContenuto(e.target.value)}
                required
                rows={4}
              />

              <button type="submit" disabled={isSending}>
                {isSending ? 'Invio in corso…' : 'Invia'}
              </button>
            </form>

            {/* Mostra il messaggio di feedback */}
            {message && (
              <p className={messageType === 'success' ? 'formMessageSuccess' : 'formMessageError'}>
                {message}
              </p>
            )}
          </div>

          {/* Box degli orari a destra */}
          <div className="timesocial">
            <div className="timeBox">
              <h3 className="whiteh3">Dove puoi trovarci</h3>
              <div>
                <p>
                  Lunedì &gt; Domenica - 17 &gt; 23
                </p>
              </div>

              <div>
                <p>
                  Via Bramante 8, Trieste <br /> Tel:{' '}
                  <a href="tel:+393454593929">345 459 3929</a>
                </p>
              </div>
            </div>

            {/* Contenitore delle icone social */}
            <div className="socialLinks footerLinks">
              <a
                href="https://www.instagram.com/enoteca_morbin"
                target="_blank"
                rel="noopener noreferrer"
                className="socialLink"
              >
                <img
                  src="/whiteinstagram.png"
                  alt="Instagram"
                  className="socialIcon"
                />
              </a>
              <a
                href="https://www.facebook.com/enoteca_morbin"
                target="_blank"
                rel="noopener noreferrer"
                className="socialLink"
              >
                <img
                  src="/whitefacebook.png"
                  alt="Facebook"
                  className="socialIcon"
                />
              </a>
            </div>
          </div>
        </div>

        <div className="footerInfo">
          <p>
            &copy; {new Date().getFullYear()} Compagnia Mercantile Triestina S.r.l.. Tutti i diritti riservati.
          </p>
        </div>
      </div>
    </footer>
  );
}
