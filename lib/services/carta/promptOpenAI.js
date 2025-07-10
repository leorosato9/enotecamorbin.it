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

    // 2. Logga anche la bottiglia su cui stiamo lavorando
    console.log(`[promptOpenAI] "${bottleStr}" → selected prompt: ${key}`);

    // 3. Costruisci il contenuto
    const template = winePrompts[key];
    const content = template
      .replace(/\$\{nome\}/g, nome)
      .replace(/\$\{regione\}/g, regione)
      .replace(/\$\{provincia\}/g, provincia)
      .replace(/\$\{comune\}/g, comune)
      .replace(/\$\{fascia\}/g, fascia)
      .replace(/\$\{menuText\}/g, menuText)
      .replace(/\$\{elencoBottiglie\}/g, elencoArray.join('\n'));

    try {
      // 4. Chiamata OpenAI
      const res = await openaiClient.chat.completions.create({
        model: 'gpt-4.1-nano',
        messages: [{ role: 'user', content }],
        temperature: 0.3,
        top_p: 0.9
      });

      const raw = res.choices[0].message.content.trim();

      // 5. Sanificazione JSON
      let cleaned = raw
        .replace(/\\(?!["\\/bfnrtu])/g, '\\\\')
        .replace(/,\s*]/g, ']');

      let arr;
      try {
        arr = JSON.parse(cleaned);
        if (!Array.isArray(arr)) throw new Error('Non è un array');
      } catch (firstErr) {
        // Fallback inserendo la ] mancante in explanation
        const fallback = cleaned.replace(
          /("explanation":\s*\[[^\]]*)(\})/,
          '$1]$2'
        );
        arr = JSON.parse(fallback);
      }

      // 6. Validazione e raccolta
      for (const obj of arr) {
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
