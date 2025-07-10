import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Admin() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Enoteca Morbin | Admin</title>
      </Head>

      <div className='scheda'>
        <h1>Admin - Seleziona un'opzione</h1>
        <div>

          <button
            onClick={() => router.push('/admin/degustazioni')}
            className='customBuyButton slugButton'
          >
            Gestisci Degustazioni
          </button>

          <button
            onClick={() => router.push('/admin/bottiglie')}
            className='customBuyButton slugButton'
          >
            Gestisci Bottiglie
          </button>

          <button
            onClick={() => router.push('/admin/gestioneAI')}
            className='customBuyButton slugButton'
          >
            Gestione AI
          </button>

        </div>
      </div>
    </>
  );
}
