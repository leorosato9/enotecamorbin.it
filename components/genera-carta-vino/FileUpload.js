export default function FileUpload({ file, onFileChange, showDetails, onViewMenu, onChangeMenu, loading }) {
  return (
    <label
      htmlFor="filePdf"
      className={`dropZone ${file ? 'uploaded' : ''} ${showDetails ? 'dropZone--shrunken' : ''}`}
    >
      <input
        type="file"
        id="filePdf"
        accept=".pdf,image/jpeg,image/jpg,image/png,image/heic,image/heif"
        onChange={onFileChange}
        required
        disabled={loading || showDetails}
        style={{ display: 'none' }}
      />
      {!showDetails ? (
        <p className="dropZone__placeholder">
          {file
            ? 'Menù caricato correttamente!'
            : 'Tocca per scegliere un PDF, un’immagine o scattare una foto'}
        </p>
      ) : (
        <>
          <p className="dropZone__main-text">Menù</p>
          <p className="dropZone__sub-text">
            Hai caricato il menu del tuo ristorante
          </p>
          <div className="doubleButton">
            <button
              type="button"
              className="customBuyButton littleButton"
              onClick={onViewMenu}
            >
              Visualizza
            </button>
            <button
              type="button"
              className="customBuyButton whitelittleButton"
              onClick={onChangeMenu}
            >
              Cambia menù
            </button>
          </div>
        </>
      )}
    </label>
  );
}