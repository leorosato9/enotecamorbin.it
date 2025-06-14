const fs = require("fs");
const path = require("path");
// Carichiamo dotenv per popolare process.env da .env.local
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });

const OpenAI = require("openai");

// 1. Leggiamo il JSON intero dei vini, che si trova in root (non in scripts/)
const viniFilePath = path.join(__dirname, "..", "vini.json");
let rawData;
try {
  rawData = fs.readFileSync(viniFilePath, "utf8");
} catch (e) {
  console.error("Impossibile leggere il file vini.json:", e);
  process.exit(1);
}

let vini;
try {
  vini = JSON.parse(rawData);
} catch (e) {
  console.error("Errore nel parsing di vini.json:", e);
  process.exit(1);
}

// 2. Inizializziamo l'istanza di OpenAI usando la chiave letta da process.env
if (!process.env.OPENAI_API_KEY) {
  console.error("Errore: la variabile OPENAI_API_KEY non è definita in .env.local");
  process.exit(1);
}
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 3. Funzione che crea una stringa sintetica per ciascun vino da mandare a OpenAI,
//    includendo tutte le proprietà presenti nello JSON
function creaTestoPerEmbedding(vino) {
  // Prelevo in sicurezza ogni campo, usando stringhe vuote se qualcosa non esistesse
  const nome = vino.nome_completo || "";
  const url = vino.url || "";
  const prezzo = vino.prezzo || "";
  const annata = vino.annata || "";
  const denominazione = vino.denominazione || "";
  const vitigni = vino.vitigni || "";
  const alcol = vino.alcol || "";
  const categoria = vino.categoria || "";
  const abbinamenti1 = vino.abbinamenti_1 || "";
  const abbinamenti2 = vino.abbinamenti_2 || "";
  const noteDegustazione = vino.note_degustazione || "";
  const perchePiace = vino.perche_piace || "";

  // Costruisco un’unica stringa che contenga ogni campo
  const testo = 
    `URL: ${url}. ` +
    `Nome completo: ${nome}. ` +
    `Prezzo: ${prezzo}. ` +
    `Annata: ${annata}. ` +
    `Denominazione: ${denominazione}. ` +
    `Categoria: ${categoria}. ` +
    `Vitigni: ${vitigni}. ` +
    `Gradazione alcolica: ${alcol}. ` +
    `Abbinamenti principali: ${abbinamenti1}. ` +
    `Altri abbinamenti: ${abbinamenti2}. ` +
    `Note di degustazione: ${noteDegustazione}. ` +
    `Perché piace: ${perchePiace}.`;

  return testo;
}

(async () => {
  const embeddings = [];

  for (let i = 0; i < vini.length; i++) {
    const vino = vini[i];
    const testoPerEmbedding = creaTestoPerEmbedding(vino);

    try {
      // 4. Chiediamo l'embedding a OpenAI
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: testoPerEmbedding,
      });
      const embedding = response.data[0].embedding;

      embeddings.push({
        id: vino.url || vino.nome_completo || `vino_${i}`,
        embedding: embedding,
        metadata: {
          nome_completo: vino.nome_completo,
          denominazione: vino.denominazione,
          categoria: vino.categoria,
          vitigni: vino.vitigni,
          prezzo: vino.prezzo,
          annata: vino.annata,
          alcol: vino.alcol,
          abbinamenti_1: vino.abbinamenti_1,
          abbinamenti_2: vino.abbinamenti_2,
        },
      });

      console.log(
        `Generato embedding per vino ${i + 1}/${vini.length}: ${vino.nome_completo}`
      );
    } catch (err) {
      console.error(
        `Errore durante generazione embedding per ${vino.nome_completo}:`,
        err
      );
    }

    // 5. Piccola pausa per evitare rate limit
    await new Promise((r) => setTimeout(r, 150));
  }

  // 6. Salviamo gli embedding nel file JSON all'interno di /scripts
  const outPath = path.join(__dirname, "embeddingsVini.json");
  try {
    fs.writeFileSync(outPath, JSON.stringify(embeddings, null, 2));
    console.log(`Tutti gli embedding sono stati salvati in ${outPath}`);
  } catch (e) {
    console.error("Errore durante il salvataggio di embeddingsVini.json:", e);
  }
})();
