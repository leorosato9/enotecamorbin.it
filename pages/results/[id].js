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
    id,
    loading,
    error,
    risultati,
    spiegazioni,
    ristorante,
    fileUrl,
    fileType,
    showPreview,
    openStates,
    regenerationCount,
    regenerationLimit,
    toggleCard,
    handleViewMenu,
    setShowPreview,
    getDotColor,
    selectedWines,
    handleWinesSelection,
    isRegenerating,
    handleRegenerate,
  } = useResults();


  if (loading || isRegenerating) return <LoadingScreen />;

  if (error) {
    return (
      <main className="scheda">
        <p className="error">Errore: {error}</p>
      </main>
    );
  }

  const regenerationsRemaining = regenerationLimit - regenerationCount;
  const hasRegenerations = regenerationsRemaining > 0;

  return (
    <>
      <Head>
        <title>Carta dei vini: {Array.isArray(id) ? id.join(', ') : id}</title>
      </Head>

      <Header />

      <main className="scheda">
        <TopInfoBoxes ristorante={ristorante} onViewMenu={handleViewMenu} />

        {risultati.length > 0 ? (
          <section>
          {risultati.map((vino, idx) => (
            <VinoCard
              key={vino.id}
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

        {risultati.length > 0 && (
          <div>
           <p className={`regeneration-counter ${!hasRegenerations ? 'unavailable' : ''}`}>
              {hasRegenerations ? (
                <>
                  Hai a disposizione ancora <span className="regeneration-counter__number">{regenerationsRemaining}</span> rigenerazion{regenerationsRemaining > 1 ? 'i' : 'e'}.
                </>
              ) : (
                'Hai usato tutte le rigenerazioni per questa carta.'
              )}
            </p>

            <button
              onClick={handleRegenerate} 
              className="customBuyButton submitButton"
              disabled={isRegenerating || selectedWines.length === risultati.length || !hasRegenerations}
            >
              {isRegenerating 
                ? 'Rigenerazione in corso...' 
                : !hasRegenerations
                  ? 'Rigenerazioni esaurite'
                  : selectedWines.length > 0 
                    ? `Rigenera la Carta (${selectedWines.length} preferiti)`
                    : 'Rigenera l\'intera Carta Vini'
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