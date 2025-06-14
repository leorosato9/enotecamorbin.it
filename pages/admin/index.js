import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Admin() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Enoteca Morbin | Admin</title>
      </Head>

      <div>
        <h1>Admin - Seleziona un'opzione</h1>
        <div>

          <button
            onClick={() => router.push('/admin/degustazioni')}
          >
            Gestisci Degustazioni
          </button>

          <button
            onClick={() => router.push('/admin/bottiglie')}
          >
            Gestisci Bottiglie
          </button>

          <button
            onClick={() => router.push('/admin/cartaVini')}
          >
            Gestione AI
          </button>

        </div>
      </div>
    </>
  );
}
