import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function LoginPage() {
  const router = useRouter();
  const { error: providerError, callbackUrl } = router.query;

  const [mode, setMode] = useState('login');
  const [authMethod, setAuthMethod] = useState(null);
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (providerError) {
      setError("Si è verificato un errore durante l'autenticazione.");
    }
  }, [providerError]);

  const finalRedirectUrl = callbackUrl || '/user';

  const handleSubmitEmail = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (mode === 'register') {
      if (!nome || !cognome || !email || !password || !confirmPassword || !telefono) {
        return setError('Compila tutti i campi richiesti.');
      }
      if (password !== confirmPassword) {
        return setError('Le password non corrispondono.');
      }
      try {
        const res = await fetch('/api/user/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, cognome, email, password, telefono }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Errore registrazione');

        const loginRes = await signIn('credentials', {
          redirect: false,
          email: email.trim().toLowerCase(),
          password,
        });

        if (loginRes?.error) {
          setError('Registrazione completata, ma si è verificato un errore nel login automatico.');
        } else {
          setSuccessMsg('Registrazione e login effettuati con successo. Reindirizzamento in corso...');
          router.push(finalRedirectUrl);
        }
      } catch (err) {
        setError(err.message);
      }
    } else { // Modalità Login
      const loginRes = await signIn('credentials', {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
      });
      if (loginRes?.error) {
        setError('Email o password non corretti');
      } else {
        setSuccessMsg('Accesso effettuato con successo. Reindirizzamento in corso...');
        router.push(finalRedirectUrl);
      }
    }
  };
  
  const handleGoogleAuth = () => {
    signIn('google', { callbackUrl: finalRedirectUrl });
  };

  return (
    <>
      <Head>
        <title>{mode === 'register' ? 'Registrati' : 'Accedi'} | Enoteca Morbin</title>
      </Head>
      <div className="scheda" style={{maxWidth: '500px', margin: '2rem auto'}}>
        <div className="loginmodalContent">
          <img src="/logo.webp" alt="Logo" className="loginmodalLogo" />
          
          {!authMethod && (
            <>
              <h2>{mode === 'register' ? 'Registrati' : 'Accedi'}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                <button onClick={() => setAuthMethod('email')} className="customBuyButton">
                  {mode === 'register' ? 'Registrati con Email' : 'Accedi con Email'}
                </button>
                <button onClick={handleGoogleAuth} className="whiteButton customBuyButton whiteButtonText">
                  {mode === 'register' ? 'Registrati con Google' : 'Accedi con Google'}
                </button>
              </div>

              <p style={{ marginTop: '1rem', color: '#555' }}>
                {mode === 'register' ? 'Hai già un account? ' : 'Non hai ancora un account? '}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => setMode(prev => prev === 'login' ? 'register' : 'login')}
                  style={{ color: '#0070f3', textDecoration: 'underline', cursor: 'pointer' }}
                >
                  {mode === 'register' ? 'Accedi' : 'Registrati'}
                </span>
              </p>
            </>
          )}

          {authMethod === 'email' && (
            <>
              <h2>{mode === 'register' ? 'Registrati con Email' : 'Accedi con Email'}</h2>
              <form onSubmit={handleSubmitEmail} style={{width: '100%'}}>
                {mode === 'register' && (
                  <>
                    <label>Nome</label>
                    <input type="text" required value={nome} onChange={e => setNome(e.target.value)} />
                    <label>Cognome</label>
                    <input type="text" required value={cognome} onChange={e => setCognome(e.target.value)} />
                  </>
                )}
                <label>Indirizzo email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
                <label>Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} />
                {mode === 'register' && (
                  <>
                    <label>Conferma password</label>
                    <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    <label>Telefono</label>
                    <input type="tel" required value={telefono} onChange={e => setTelefono(e.target.value)} />
                  </>
                )}
                <button type="submit" className="customBuyButton" style={{marginTop: '1rem', width: '100%'}}>
                  {mode === 'register' ? 'Crea account' : 'Accedi'}
                </button>
              </form>

              {error && <p style={{ color: 'red' }}>{error}</p>}
              {successMsg && <p style={{ color: 'green' }}>{successMsg}</p>}

              <button onClick={() => setAuthMethod(null)} className="indietroButton whiteButton customBuyButton whiteButtonText" style={{marginTop: '1rem'}}>
                Indietro
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
