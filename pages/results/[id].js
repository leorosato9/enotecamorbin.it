import Head from 'next/head';
import React from 'react';

import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import LoadingScreen from '../../components/ui/LoadingScreen';
import PreviewOverlay from '../../components/ui/PreviewOverlay';
import VinoCard from '../../components/results/VinoCard';
import TopInfoBoxes from '../../components/results/TopInfoBoxes';
import useResults from '../../hooks/useResults';

export default function Risultati() {
  const {
    id, loading, error, risultati, spiegazioni, ristorante, fileUrl, fileType,
    showPreview, openStates, regenerationCount, regenerationLimit, toggleCard,
    handleViewMenu, setShowPreview, getDotColor, selectedWines, handleWinesSelection,
    isRegenerating, handleRegenerate,
  } = useResults();

  if (loading || isRegenerating) return <LoadingScreen />;

  if (error) {
    return (
      <main className="scheda"><p className="error">Errore: {error}</p></main>
    );
  }

  const canCalculateRegenerations = typeof regenerationLimit === 'number' && typeof regenerationCount === 'number';
  const regenerationsRemaining = canCalculateRegenerations ? regenerationLimit - regenerationCount : 0;
  const hasRegenerations = canCalculateRegenerations ? regenerationsRemaining > 0 : false;

  return (
    <>
      <Head>
        <title>Carta dei vini: {ristorante ? ristorante.nome : 'Caricamento...'}</title>
      </Head>

      <Header />

      <main className="scheda">
        <TopInfoBoxes ristorante={ristorante} onViewMenu={handleViewMenu} />

        {risultati.length > 0 ? (
          <section>
            <p className='regeneration-counter descriptionP'>
              Seleziona i preferiti, rigenera i rimanenti
            </p>
            {risultati.map((vino, idx) => (
              <VinoCard
                key={vino.id || idx}
                vino={vino}
                expl={spiegazioni[idx] || { explanation: '', bullets: [] }}
                isOpen={openStates[idx]}
                toggle={() => toggleCard(idx)}
                getDotColor={getDotColor}
                isSelected={selectedWines.includes(vino.id)}
                onSelectionChange={() => handleWinesSelection(vino.id)}
              />
            ))}
          </section>
        ) : (
          <p>Nessun risultato trovato per questo ID.</p>
        )}

        {risultati.length > 0 && canCalculateRegenerations && (
          <div>
            <p className={`regeneration-counter ${!hasRegenerations ? 'unavailable' : ''}`}>
              {hasRegenerations ? (
                <>
                  Hai a disposizione ancora <span className="regeneration-counter__number">{regenerationsRemaining}</span> rigenerazion{regenerationsRemaining === 1 ? 'e' : 'i'}.
                </>
              ) : (
                'Hai usato tutte le rigenerazioni per questa carta.'
              )}
            </p>

            <button
              onClick={handleRegenerate}
              className="customBuyButton submitButton"
              disabled={isRegenerating || !hasRegenerations || selectedWines.length === risultati.length}
            >
              {isRegenerating
                ? 'Rigenerazione in corso...'
                : !hasRegenerations
                  ? 'Rigenerazioni esaurite'
                  : selectedWines.length > 0
                    ? `Tieni ${selectedWines.length} preferit${selectedWines.length === 1 ? 'o' : 'i'} e rigenera il resto`
                    : "Rigenera l'intera Carta Vini"
              }
            </button>
          </div>
        )}
      </main>

      <PreviewOverlay
        show={showPreview}
        fileUrl={fileUrl}
        fileType={fileType}
        onClose={() => setShowPreview(false)}
      />

      <Footer />
    </>
  );
}