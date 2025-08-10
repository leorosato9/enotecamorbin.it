// lib/services/menu/parseMenuToDishes.js
import OpenAI from 'openai';
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function parseMenuToDishes(menuText) {
  const sys =
    'Estrai i piatti dal menù e mappali in JSON con attributi standard. ' +
    'Se un’informazione non è esplicita, scegli il valore prudente. Niente invenzioni.';
  const user = `
MENÙ:
${menuText}

RESTITUISCI SOLO JSON con questa forma esatta:
{
  "dishes":[
    {
      "name":"string",
      "course":"antipasto|primo|secondo|contorno|altro",
      "family":"pesce|carne_bianca|carne_rossa|vegetariano|formaggi|salumi|dolce",
      "technique":"crudo|fritto|griglia|brasato|arrosto|saltato|forno|bollito|marinato|altro",
      "intensity":"leggera|media|intensa",
      "fat":"bassa|media|alta",
      "acidity":"bassa|media|alta",
      "umami":"basso|medio|alto",
      "spice":"no|leggera|media|alta",
      "sauce":"in_bianco|pomodoro|burro_formaggio|brodo|agrodolce|altro",
      "tags":["pasta|riso|crostacei|molluschi|pesce_azzurro|selvaggina|funghi|tartufo|legumi|verdure|affumicato|piccante|agrumi"]
    }
  ]
}
`;

  const res = await client.chat.completions.create({
    model: 'gpt-4.1-nano',
    messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
    temperature: 0
  });

  const raw = res.choices?.[0]?.message?.content?.trim() || '{"dishes":[]}';
  try {
    const json = JSON.parse(raw);
    return Array.isArray(json.dishes) ? json.dishes : [];
  } catch {
    return [];
  }
}
