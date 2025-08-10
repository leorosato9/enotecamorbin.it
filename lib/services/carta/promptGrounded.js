// lib/services/carta/promptGrounded.js
import OpenAI from 'openai';
import winePrompts from './winePrompts.js'; // usa il tuo basePrompt “esigente”

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const sub = (tpl, key, val) => tpl.replace(new RegExp(String.raw`\\?\$\{${key}\}`, 'g'), String(val ?? ''));

export async function generateWineExplanationsGrounded({
  context, // { nome, regione, provincia, comune, fascia, menuText }
  wines    // [{ name, facts: { producer, denomination, grapes?, region?, country?, family? }, allowedDishes?: string[] }]
}) {
  // Prepara blocco facts per l’AI (blindato)
  const factsBlock = JSON.stringify(
    wines.map((w, i) => ({ i, name: w.name, facts: w.facts, allowedDishes: w.allowedDishes || [] })), null, 2
  );

  let content = winePrompts.basePrompt;
  content = sub(content, 'nome', context.nome);
  content = sub(content, 'regione', context.regione);
  content = sub(content, 'provincia', context.provincia);
  content = sub(content, 'comune', context.comune);
  content = sub(content, 'fascia', context.fascia);
  content = sub(content, 'menuText', context.menuText);
  content = sub(content, 'elencoBottiglie', wines.map(w => `- ${w.name}`).join('\n'));

  const sys =
    'Usa SOLO i facts forniti per ogni vino. Se un fact manca, usa formule prudenti. ' +
    'Rispondi ESCLUSIVAMENTE con un ARRAY JSON valido, schema già noto nel prompt utente.';
  const user = `${content}\n\nFACTS PER VINO (non inventare oltre questi):\n${factsBlock}`;

  const res = await client.chat.completions.create({
    model: 'gpt-4.1-nano',
    messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
    temperature: 0.2
  });

  const raw = res.choices?.[0]?.message?.content?.trim() || '[]';
  try {
    const m = raw.match(/\[[\s\S]*\]/);
    return JSON.parse(m ? m[0] : raw);
  } catch {
    return wines.map(() => ({ name: '', bullets: Array(6).fill(''), explanation: Array(4).fill('') }));
  }
}
