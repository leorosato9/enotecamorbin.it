const fs = require("fs");
const path = require("path");
const axios = require("axios");
require("dotenv").config({ path: ".env.local" });

// Lettura variabili ambiente
const API_KEY = process.env.PINECONE_API_KEY;
const INDEX_ENDPOINT = process.env.PINECONE_INDEX_ENDPOINT;

if (!API_KEY || !INDEX_ENDPOINT) {
  console.error("❌ Definisci PINECONE_API_KEY e PINECONE_INDEX_ENDPOINT in .env.local");
  process.exit(1);
}

// Percorso al file degli embeddings generati
const EMBEDDINGS_PATH = path.join(__dirname, "embeddingsVini.json");

// Funzione per pulire i metadata in formati accettati da Pinecone
function sanitizeMetadata(rawMeta = {}) {
  const cleanMeta = {};
  for (const [key, value] of Object.entries(rawMeta)) {
    if (value === null || value === undefined) {
      // Saltare o impostare a stringa vuota
      cleanMeta[key] = "";
    } else if (Array.isArray(value)) {
      // Mappa ogni elemento a stringa
      cleanMeta[key] = value.map(item => (item === null || item === undefined ? "" : item.toString()));
    } else if (typeof value === 'object') {
      // Converti oggetti in stringa JSON
      cleanMeta[key] = JSON.stringify(value);
    } else {
      // Stringhe, numeri, booleani sono ok
      cleanMeta[key] = value;
    }
  }
  return cleanMeta;
}

// Funzione principale
(async () => {
  let embeddings;
  try {
    embeddings = JSON.parse(fs.readFileSync(EMBEDDINGS_PATH, "utf8"));
    console.log(`📦 Caricati ${embeddings.length} vettori da ${EMBEDDINGS_PATH}`);
  } catch (err) {
    console.error("❌ Impossibile leggere o parsare embeddingsVini.json:", err);
    process.exit(1);
  }

  const batchSize = 100;
  for (let i = 0; i < embeddings.length; i += batchSize) {
    const batch = embeddings.slice(i, i + batchSize).map((v, idx) => ({
      id: v.id?.toString() || `missing_${i + idx}`,
      values: v.embedding,
      metadata: sanitizeMetadata(v.metadata)
    }));

    console.log(`📤 Upload batch ${i + 1} - ${Math.min(i + batchSize, embeddings.length)}`);
    try {
      const res = await axios.post(
        `${INDEX_ENDPOINT}/vectors/upsert`,
        { vectors: batch },
        {
          headers: {
            "Content-Type": "application/json",
            "Api-Key": API_KEY
          }
        }
      );
      console.log(`✅ Batch ${i + 1} caricato (${batch.length} vettori).`);
    } catch (err) {
      console.error(`❌ Errore batch ${i + 1}:`, err.response?.data || err.message);
      process.exit(1);
    }
  }

  console.log("🎉 Tutti gli embeddings sono stati inviati a Pinecone!");
})();