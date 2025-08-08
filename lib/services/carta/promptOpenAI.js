// lib/services/carta/promptOpenAI.js

import OpenAI from 'openai';
import winePrompts from './winePrompts.js';
import { isValidExplanation } from './validateExplanations.js';

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateWineExplanations({
  nome, regione, provincia, comune, fascia,
  menuText, elencoBottiglie
}) {
  const promptKeys = Object.keys(winePrompts).filter(k => k !== 'basePrompt');
  let lastKey = null;
  const explanations = [];

  // Prepara l'elenco delle bottiglie in stringa
  const elencoArray = Array.isArray(elencoBottiglie)
    ? elencoBottiglie
    : [String(elencoBottiglie)];

  for (const bottleStr of elencoArray) {
    // 1. Scegli un prompt casuale (mai uguale a lastKey)
    const available = promptKeys.filter(k => k !== lastKey);
    const key = available[Math.floor(Math.random() * available.length)];
    lastKey = key;

    // 3. Costruisci il contenuto
    const template = winePrompts[key];
    const content = template
      .replace(/\$\{nome\}/g, nome)
      .replace(/\$\{regione\}/g, regione)
      .replace(/\$\{provincia\}/g, provincia)
      .replace(/\$\{comune\}/g, comune)
      .replace(/\$\{fascia\}/g, fascia)
      .replace(/\$\{menuText\}/g, menuText)
      .replace(/\$\{elencoBottiglie\}/g, `- ${bottleStr}`);

    try {
      const res = await openaiClient.chat.completions.create({
        model: 'gpt-4.1-nano',
        messages: [
          { role: 'system', content: 'Rispondi SOLO con un ARRAY JSON. Nessun testo extra. Ogni elemento deve avere: name(string), bullets(array di 6 stringhe), explanation(array di 4 stringhe).' },
          { role: 'user', content }
        ],
        temperature: 0.1,
        top_p: 0.9,
        response_format: { type: 'json_object' } // forza l'output JSON
      });


      const raw = res.choices[0].message.content.trim();

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        console.error('[generateWineExplanations] parse fail:', raw);
        parsed = null;
      }

      let arr = [];
      if (Array.isArray(parsed)) {
        arr = parsed;
      } else if (parsed && Array.isArray(parsed.spiegazioni)) {
        arr = parsed.spiegazioni;
      } else if (parsed && Array.isArray(parsed.explanations)) {
        arr = parsed.explanations;
      } else if (parsed && Array.isArray(parsed.wines)) {
        arr = parsed.wines; // ✅ nuova gestione per il wrapper "wines"
      } else if (parsed && typeof parsed === 'object') {
        arr = [parsed];
      }


      // se per errore arrivano più item, prendi solo il primo
      if (arr.length > 1) arr = [arr[0]];


      // 6. Validazione e raccolta con logging degli errori
      for (const obj of arr) {
        if (!isValidExplanation(obj)) {
          console.warn(
            `[generateWineExplanations] ❌ Invalid explanation per bottiglia: "${bottleStr}"`,
            obj
          );
        }
        explanations.push(
          isValidExplanation(obj)
            ? obj
            : { name: obj.name || '', bullets: Array(6).fill(''), explanation: Array(4).fill('') }
        );
      }


    } catch (err) {
      console.error('[generateWineExplanations] API or parse error:', err);
    }
  }

  return explanations;
}
