export default function PreviewOverlay({ show, fileUrl, fileType, onClose }) {
  if (!show || !fileUrl) return null;
  const isImage = fileType?.startsWith('image/');

  return (
    <div className="previewOverlay" onClick={onClose}>
      <div className="previewContent" onClick={e => e.stopPropagation()}>
        {isImage ? (
          <img src={fileUrl} alt="Anteprima del menù" />
        ) : (
          <iframe
            src={fileUrl}
            title="Anteprima del menù"
            width="100%"
            height="100%"
            style={{ border: 'none' }}
          />
        )}
        <button
          type="button"
          className="customBuyButton submitButton"
          onClick={onClose}
        >
          Chiudi
        </button>
      </div>
    </div>
  );
}