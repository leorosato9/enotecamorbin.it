export const loadGoogleAnalytics = () => {
    if (typeof window !== 'undefined' && !window.gtag) {
      // Crea il primo script per caricare gtag.js da Google
      const script1 = document.createElement('script');
      script1.src = `https://www.googletagmanager.com/gtag/js?id=G-B1FG1QC01J`;
      script1.async = true;
      document.head.appendChild(script1);
  
      // Crea il secondo script per configurare Google Analytics con il tuo ID
      const script2 = document.createElement('script');
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-B1FG1QC01J');
      `;
      document.head.appendChild(script2);
    }
  };
  