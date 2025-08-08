// pages/_app.js
import '../styles/globals.css';
import Script from 'next/script';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const { session, ...rest } = pageProps;

  useEffect(() => {
    const handleRouteChange = () => {
      if (window.fbq) window.fbq('track', 'PageView');
    };
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
  }, [router.events]);

  return (
    <>
      {/* Inseriamo il Facebook Pixel in modalità afterInteractive */}
      <Script id="fb-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', 'LA_TUA_PIXEL_ID');
          fbq('track', 'PageView');
        `}
      </Script>

      <SessionProvider session={session}>
        <Component {...rest} />
      </SessionProvider>
    </>
  );
}

export default MyApp;
