import React, { useEffect } from 'react';

// Nessun import di react-pdf qui

const PreviewOverlay = ({ file, onClose }) => {
    useEffect(() => {
        const handleEsc = (event) => {
            if (event.keyCode === 27) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);

        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    // Funzione per gestire il click sull'overlay
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!file) return null;

    const fileURL = URL.createObjectURL(file);
    const isImage = file.type.startsWith('image/');

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            onClick={handleOverlayClick} // <-- L'UNICA VERA MODIFICA NECESSARIA
        >
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                <div className="flex-grow overflow-auto">
                    {/* Logica originale che gestisce solo le immagini */}
                    {isImage ? (
                        <img src={fileURL} alt="Preview" className="max-w-full max-h-full" />
                    ) : (
                        <p>Formato file non supportato per l'anteprima. Supportiamo solo immagini.</p>
                    )}
                </div>
                <div className="mt-4 text-right">
                    <button
                        onClick={onClose}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                        Chiudi
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PreviewOverlay;