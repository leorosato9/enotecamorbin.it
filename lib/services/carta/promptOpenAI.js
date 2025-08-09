// lib/services/carta/promptOpenAI.js

import OpenAI from 'openai';
import winePrompts from './winePrompts.js';
import { isValidExplanation } from './validateExplanations.js';

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// helper: sostituisce ${var} O \${var}
const sub = (tpl, key, val) =>
  tpl.replace(new RegExp(String.raw`\\?\$\{${key}\}`, 'g'), String(val ?? ''));

export async function generateWineExplanations({
  nome, regione, provincia, comune, fascia,
  menuText, elencoBottiglie
}) {
  // Normalizza input bottiglie
  const elencoArray = Array.isArray(elencoBottiglie)
    ? elencoBottiglie.filter(Boolean).map(String)
    : [String(elencoBottiglie)];

  // Costruisci una sola lista markdown (una per riga)
  const elencoMarkdown = elencoArray.map(b => `- ${b}`).join('\n');

  // Prepara il prompt unico
  let template = winePrompts.basePrompt;
  let content = template;
  content = sub(content, 'nome', nome);
  content = sub(content, 'regione', regione);
  content = sub(content, 'provincia', provincia);
  content = sub(content, 'comune', comune);
  content = sub(content, 'fascia', fascia);
  content = sub(content, 'menuText', menuText);
  content = sub(content, 'elencoBottiglie', elencoMarkdown);

  let raw = '[]';
  try {
    const res = await openaiClient.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: 'Rispondi SOLO con un ARRAY JSON. Nessun testo extra.' },
        { role: 'user', content }
      ],
      temperature: 0.2,
      top_p: 0.9
    });

    raw = (res.choices?.[0]?.message?.content || '').trim();
  } catch (err) {
    console.error('[generateWineExplanations] OpenAI error:', err);
  }

  // Prova a isolare un array JSON se ci sono accidentalmente testi extra
  let parsed;
  try {
    // estrae il primo blocco che inizia con [ e finisce con ]
    const m = raw.match(/\[[\s\S]*\]$/);
    parsed = JSON.parse(m ? m[0] : raw);
  } catch (e) {
    console.error('[generateWineExplanations] parse fail:', raw);
    parsed = [];
  }

  // Normalizza: ottieni un array
  let arr = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.wines)
      ? parsed.wines
      : Array.isArray(parsed?.explanations)
        ? parsed.explanations
        : Array.isArray(parsed?.spiegazioni)
          ? parsed.spiegazioni
          : (parsed && typeof parsed === 'object' ? [parsed] : []);

  // Se il modello ha restituito più/meno elementi, allinea a elencoArray
  if (arr.length > elencoArray.length) arr = arr.slice(0, elencoArray.length);
  if (arr.length < elencoArray.length) {
    // pad con placeholder vuoti
    while (arr.length < elencoArray.length) arr.push({});
  }

  // Validazione finale elemento-per-elemento
  const explanations = arr.map((obj, idx) => {
    if (!isValidExplanation(obj)) {
      console.warn(`[generateWineExplanations] ❌ invalid item per "${elencoArray[idx]}"`, obj);
      return { name: '', bullets: Array(6).fill(''), explanation: Array(4).fill('') };
    }
    return obj;
  });

  return explanations;
}
