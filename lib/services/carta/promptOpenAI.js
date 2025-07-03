// lib/services/carta/promptOpenAI.js
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateWineExplanations({ nome, regione, provincia, comune, fascia, menuText, elencoBottiglie }) {
  // Prompt leggermente esteso per descrizioni più dettagliate
  const prompt = `Genera per ciascun vino un oggetto JSON con:
- name: "Cantina – Nome"
- bullets: array di 6 stringhe (uve, profumi, sapori, servizio, abbinamenti)
- explanation: array di 5 stringhe (3 punti chiave sintetici + 1 deep dive più esteso in italiano di 5-6 frasi + 1 frase conclusiva di invito)

Locale: ${nome}, ${comune} (${provincia}), ${regione}, fascia ${fascia}
Menu:
${menuText}
Vini:
${elencoBottiglie}`;

  const res = await openai.chat.completions.create({
    model: 'gpt-4.1-nano',
    messages: [{ role: 'user', content: prompt }],
    functions: [{
      name: 'return_explanations',
      description: 'Restituisce un array di spiegazioni',
      parameters: {
        type: 'object',
        properties: {
          explanations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                bullets: { type: 'array', items: { type: 'string' }, minItems: 6, maxItems: 6 },
                explanation: { type: 'array', items: { type: 'string' }, minItems: 5, maxItems: 5 }
              },
              required: ['name','bullets','explanation']
            }
          }
        },
        required: ['explanations']
      }
    }],
    function_call: { name: 'return_explanations' },
    temperature: 0,
    max_tokens: 3000
  });

  const args = JSON.parse(res.choices[0].message.function_call.arguments);
  return Array.isArray(args.explanations) ? args.explanations : [];
}
