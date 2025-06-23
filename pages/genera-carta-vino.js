import Head from 'next/head';
import React from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import LoadingScreen from '../components/ui/LoadingScreen';
import PreviewOverlay from '../components/ui/PreviewOverlay';
import FileUpload from '../components/genera-carta-vino/FileUpload';
import RestaurantForm from '../components/genera-carta-vino/RestaurantForm';
import useGeneraCartaVino from '../hooks/useGeneraCartaVino';

export default function GeneraCartaVino() {
  const {
    nome,
    setNome, 
    fascia, 
    setFascia, 
    filePdf, 
    loading, 
    error, 
    showDetails,
    showPreview, 
    setShowPreview,
    fileURL, 
    setShowDetails, 
    handleFileChange, 
    handleViewMenu,
    handleChangeMenu, 
    handleFormSubmit, 
    regione, 
    setRegione, 
    provincia, 
    setProvincia,
    provinceList, 
    comune, 
    setComune, 
    comuniList, 
    authStatus, 
    userActivities,
    isLoadingActivities, 
    onActivitySelect, 
    modalState, 
    setModalState,
    handleLoginSuccess, 
    restaurantLimitError, 
    weeklyLimitError,
  } = useGeneraCartaVino();

  if (loading) return <LoadingScreen />;
  
  const isCreatingNew = !userActivities.some(act => act.nome === nome);
  const isActionBlocked = !!weeklyLimitError || (isCreatingNew && !!restaurantLimitError);

  return (
    <div>
      <Head>
        <title>Enoteca Morbin | Abbina i vini al tuo menù</title>
      </Head>
      <Header />

      <div className={`scheda ${showDetails ? 'scheda--compact' : ''}`}>
        <h2 className="centralTitle">Carica il tuo menù</h2>
        <h3 className="centralTitle">Carica o scatta una foto al tuo menù</h3>

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
              onClick={() => {
                if (!filePdf) {
                  return;
                }
                setShowDetails(true)
              }}
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
                restaurantLimitError={restaurantLimitError}
                weeklyLimitError={weeklyLimitError}
              />
              
              {!isActionBlocked && (
                <button
                  type="submit"
                  disabled={loading}
                  className="customBuyButton submitButton"
                >
                  Genera la tua Carta Vini
                </button>
              )}
            </>
          )}
        </form>

        {error && !isActionBlocked && <p className="error">{error}</p>}
      </div>

      <PreviewOverlay
        show={showPreview}
        fileUrl={fileURL}
        fileType={filePdf?.type}
        onClose={() => setShowPreview(false)}
      />

      <Footer />
    </div>
  );
}