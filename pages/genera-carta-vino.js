import Head from 'next/head';
import React from 'react';
import { useSession } from 'next-auth/react';

import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import LoadingScreen from '../components/ui/LoadingScreen';
import PreviewOverlay from '../components/ui/PreviewOverlay';
import FileUpload from '../components/genera-carta-vino/FileUpload';
import RestaurantForm from '../components/genera-carta-vino/RestaurantForm';
import useGeneraCartaVino from '../hooks/useGeneraCartaVino';

export default function GeneraCartaVino() {
  const { status } = useSession();
  const {
    nome, setNome,
    fascia, setFascia,
    filePdf,
    loading,
    error,
    showDetails, setShowDetails,
    showPreview, setShowPreview,
    fileURL,

    handleFileChange,
    handleChangeMenu,
    handleViewMenu,

    regione, setRegione,
    provincia, setProvincia,
    comune, setComune,
    provinceList, comuniList,

    userActivities,
    isLoadingActivities,
    onActivitySelect,
    restaurantLimitError,
    weeklyLimitError,
    activityId,

    handleFormSubmit
  } = useGeneraCartaVino();

  const isCreatingNew   = !userActivities.some(a => a.nome === nome);
  const errorForForm    = isCreatingNew ? restaurantLimitError : weeklyLimitError;
  const isActionBlocked = !!errorForForm;

  if (loading) return <LoadingScreen />;

  return (
    <>
      <Head>
        <title>Enoteca Morbin | Genera Carta Vini</title>
      </Head>

      <Header />

      <main className={`scheda ${showDetails ? 'scheda--compact' : ''}`}>
        <h2 className="centralTitle">Carica il tuo menù</h2>
        <h3 className="centralTitle">PDF o foto del menù</h3>

        {error && <p className="error-message-box">{error}</p>}

        <form onSubmit={handleFormSubmit}>
          
          <FileUpload
            file={filePdf}
            onFileChange={handleFileChange}
            showDetails={showDetails}
            onViewMenu={handleViewMenu}
            onChangeMenu={handleChangeMenu}
            loading={loading}
          />
          
          {!showDetails && (
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              className="customBuyButton spaceButton"
            >
              Continua
            </button>
          )}

          {showDetails && (
            <>
              <RestaurantForm
                nome={nome} setNome={setNome}
                regione={regione} setRegione={setRegione}
                provincia={provincia} setProvincia={setProvincia}
                comune={comune} setComune={setComune}
                fascia={fascia} setFascia={setFascia}
                provinceList={provinceList}
                comuniList={comuniList}
                userActivities={userActivities}
                onActivitySelect={onActivitySelect}
                loading={loading}
                error={errorForForm}
              />

              {!isActionBlocked && (
                <button
                  type="submit"
                  className="customBuyButton submitButton"
                  disabled={loading}
                >
                  Genera la tua Carta Vini
                </button>
              )}
            </>
          )}
        </form>

        <PreviewOverlay
          show={showPreview}
          fileUrl={fileURL}
          fileType={filePdf?.type}
          onClose={() => setShowPreview(false)}
        />
      </main>

      <Footer />
    </>
  );
}
