import { useState, useEffect } from 'react';
import { connectToDatabase } from '../../lib/mongodb';
import Head from 'next/head';

export async function getServerSideProps() {
  const { db } = await connectToDatabase();
  const bottiglie = await db.collection('bottiglie').find().toArray();
  const serializedBottiglie = bottiglie.map((bottiglia) => ({
    id: bottiglia._id.toString(),
    etichetta: bottiglia.etichetta ?? null,
  }));  

  return {
    props: {
      initialBottiglie: serializedBottiglie,
    },
  };
}

export default function Bottiglie({ initialBottiglie }) {
  const [bottiglie] = useState(initialBottiglie);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBottigliaModalOpen, setIsBottigliaModalOpen] = useState(false);
  const [selectedBottiglia, setSelectedBottiglia] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [etichetta, setEtichetta] = useState('');
  const [categoria, setCategoria] = useState('');
  const [provenienza, setProvenienza] = useState('');
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);

  const filteredBottiglie = bottiglie.filter((bottiglia) =>
    (bottiglia.etichetta ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );  

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const openBottigliaModal = (bottiglia) => {
    setSelectedBottiglia(bottiglia);
    setIsBottigliaModalOpen(true);
  };

  const closeBottigliaModal = () => {
    setSelectedBottiglia(null);
    setIsBottigliaModalOpen(false);
  };

  const openAddModal = () => setIsAddModalOpen(true);
  const closeAddModal = () => setIsAddModalOpen(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFoto(reader.result);
        setFotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/bottiglie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etichetta, categoria, provenienza, foto }),
      });
      if (!response.ok) {
        throw new Error('Errore nella aggiunta della bottiglia');
      }
      const data = await response.json();
      console.log('Bottiglia aggiunta:', data);
      closeAddModal();
    } catch (error) {
      console.error(error);
    }
  };

  // Intercetta CMD+F (o CTRL+F) e apri la modale di ricerca
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        openModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      <Head>
        <title>Enoteca Morbin | Admin - Gestione Bottiglie</title>
      </Head>

      <div className="adminContainer">
        <h1>Gestione Bottiglie</h1>

        <div className="overTable">
          <div className="addContainer">
            <button className="customBuyButton slugButton" onClick={openAddModal}>
              Aggiungi Bottiglia
            </button>
          </div>
          <div className="searchContainer">
            <img
              src="/search.png"
              alt="Apri"
              className="modalIcon"
              onClick={openModal}
            />
          </div>
        </div>

        {isModalOpen && (
          <div className="modalOverlay">
            <div className="modalContent">
              <div className="modalHeader">
                <h2 className="modalTitle">Cerca Bottiglia</h2>
                <img
                  src="/close-window.png"
                  alt="Chiudi"
                  className="modalIcon"
                  onClick={closeModal}
                />
              </div>
              <input
                type="text"
                placeholder="Cerca per nome o cantina..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="searchInput"
              />
              <div className="searchResults">
                {filteredBottiglie.map((bottiglia) => (
                  <div
                    key={bottiglia.id}
                    className="searchResultItem"
                    onClick={() => openBottigliaModal(bottiglia)}
                  >
                    <div className="resultBox">
                      <p>{bottiglia.etichetta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {isBottigliaModalOpen && selectedBottiglia && (
          <div className="modalOverlay">
            <div className="modalContent">
              <div className="modalHeader">
                <h2 className="modalTitle">Scheda Bottiglia</h2>
                <img
                  src="/close-window.png"
                  alt="Chiudi"
                  className="modalIcon"
                  onClick={closeBottigliaModal}
                />
              </div>
              <div className="bottigliaDetails">
                <p>
                  <strong>Nome:</strong> {selectedBottiglia.etichetta}
                </p>
              </div>
            </div>
          </div>
        )}

        {isAddModalOpen && (
          <div className="modalOverlay">
            <div className="modalContent">
              <div className="modalHeader">
                <h2 className="modalTitle">Aggiungi Bottiglia</h2>
                <img
                  src="/close-window.png"
                  alt="Chiudi"
                  className="modalIcon"
                  onClick={closeAddModal}
                />
              </div>
              <form onSubmit={handleSubmit}>
                <div className="formRow">
                  <div className="leftColumn">
                    <div className="formGroup">
                      <label htmlFor="etichetta">Nome etichetta</label>
                      <input
                        type="text"
                        id="etichetta"
                        value={etichetta}
                        onChange={(e) => setEtichetta(e.target.value)}
                        placeholder="Inserisci etichetta"
                        className="searchInput modalInput"
                      />
                    </div>
                    <div className="formGroup">
                      <label htmlFor="categoria">Categoria</label>
                      <select
                        id="categoria"
                        value={categoria}
                        onChange={(e) => setCategoria(e.target.value)}
                        className="modalInput"
                      >
                        <option value="">Seleziona Categoria</option>
                        <option value="Vino Rosso">Vino Rosso</option>
                        <option value="Vino Bianco">Vino Bianco</option>
                        <option value="Birra">Birra</option>
                        <option value="Sparkling">Sparkling</option>
                        <option value="Analcolico">Analcolico</option>
                        <option value="Spirit">Spirit</option>
                      </select>
                    </div>
                    <div className="formGroup">
                      <label htmlFor="provenienza">Provenienza</label>
                      <input
                        type="text"
                        id="provenienza"
                        value={provenienza}
                        onChange={(e) => setProvenienza(e.target.value)}
                        placeholder="Inserisci provenienza"
                        className="searchInput modalInput"
                      />
                    </div>
                  </div>
                  <div className="rightColumn">
                    <div className="formGroup">
                      <label htmlFor="foto"></label>
                      <input
                        type="file"
                        id="foto"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                      />
                      <label htmlFor="foto" className="customFileInput">
                        {fotoPreview ? (
                          <img
                            src={fotoPreview}
                            alt="Anteprima foto"
                            className="modalImage imagePreview"
                            style={{ cursor: 'pointer', maxWidth: '300px', margin: '1rem 0' }}
                          />
                        ) : (
                          <img
                            src="/uploadimage.png"
                            alt="Clicca per caricare l'immagine"
                            className="modalImage"
                            style={{ cursor: 'pointer', maxWidth: '300px', margin: '1rem 0' }}
                          />
                        )}
                      </label>
                    </div>
                  </div>
                </div>
                <button type="submit" className="customBuyButton">
                  Salva Bottiglia
                </button>
              </form>

            </div>
          </div>
        )}

        <table className="table">
          <thead>
            <tr>
              <th className="titoloTabella numberColumn"></th>
              <th className="titoloTabella">Nome etichetta</th>
              <th className="titoloTabella">Apri scheda</th>
            </tr>
          </thead>
          <tbody>
            {bottiglie.map((bottiglia, index) => (
              <tr key={bottiglia.id}>
                <td className="contenutoTabella">{index + 1}</td>
                <td className="contenutoTabella">{bottiglia.etichetta}</td>
                <td className="contenutoTabella">Apri scheda</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
