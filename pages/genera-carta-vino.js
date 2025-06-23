// File: pages/genera-carta-vino.js

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
    nome, setNome,
    fascia, setFascia,
    filePdf,
    loading,
    error,
    showDetails,
    showPreview,
    fileURL,
    setShowDetails,
    handleFileChange,
    handleViewMenu,
    handleChangeMenu,
    handleFormSubmit,
    regione, setRegione,
    provincia, setProvincia, provinceList,
    comune, setComune, comuniList,
    authStatus,
    userActivities,
    isLoadingActivities,
    onActivitySelect,
    modalState,
    setModalState,
    handleLoginSuccess,
    restaurantLimitError,
    weeklyLimitError,
    selectedActivityId,
  } = useGeneraCartaVino();

  if (loading) return <LoadingScreen />;
  
  const activeLimitError = weeklyLimitError || (restaurantLimitError && !selectedActivityId ? restaurantLimitError : null);

  const isButtonDisabled = loading || !!activeLimitError;

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
              onClick={() => setShowDetails(true)}
              disabled={!filePdf}
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
                loading={loading}
                authStatus={authStatus}
                userActivities={userActivities}
                isLoadingActivities={isLoadingActivities}
                onActivitySelect={onActivitySelect}
                limitError={activeLimitError}
                modalState={modalState}
                onCloseModal={() => setModalState({ isOpen: false, initialView: 'register' })}
                onOpenLoginModal={() => setModalState({ isOpen: true, initialView: 'login' })}
                onLoginSuccess={handleLoginSuccess}
              />
              <button
                type="submit"
                disabled={isButtonDisabled}
                className="customBuyButton submitButton"
              >
                Genera la tua Carta Vini
              </button>
            </>
          )}
        </form>

        {error && !activeLimitError && <p className="error">{error}</p>}
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