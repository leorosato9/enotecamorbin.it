import '../styles/globals.css';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url) => {
      if (window.fbq) {
        window.fbq('track', 'PageView');
      }
    };
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  // Estraiamo la session dalle pageProps (NextAuth la invia qui)
  const { session, ...restPageProps } = pageProps;

  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="true"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];
              t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', 'LA_TUA_PIXEL_ID');
              fbq('track', 'PageView');
            `,
          }}
        />
      </Head>
      <SessionProvider session={session}>
        <Component {...restPageProps} />
      </SessionProvider>
    </>
  );
}

export default MyApp;
