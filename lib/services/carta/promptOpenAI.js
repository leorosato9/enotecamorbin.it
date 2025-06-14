import OpenAI from 'openai';
const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateWineExplanations({ nome, regione, provincia, comune, fascia, menuText, elencoBottiglie }) {
  console.log('[openaiService] → Enter generateWineExplanations');

  const prompt = `
Restituisci *solo* un array JSON valido, senza alcun altro testo.

Ti fornisco di seguito tutti i dettagli di un ristorante, il testo completo del menù e l’elenco delle bottiglie di vino selezionate automaticamente tramite Pinecone + MMR.

Per ogni bottiglia, restituisci un oggetto JSON con queste chiavi:
  • "name": nome formattato minimalmente come "Cantina – Nome". Non includere dettagli che riguardano il tappo, denominazione, ecc
  • "bullets": un array di esattamente 6 stringhe:
      – Uve o uvaggio utilizzati  
      – Note olfattive principali  
      – Note gustative principali  
      – Temperatura di servizio e indicazione su eventuale decantazione  
      – (Solo se la fascia di prezzo è "€€€€€"): tipo di bicchiere consigliato  
      – Abbinamenti gastronomici (piatto principale e due alternative per antipasti o formaggi)
  • "explanation": un array di 4 stringhe:
      1. Punto chiave 1: caratteristica generale  
      2. Punto chiave 2: caratteristica generale  
      3. Punto chiave 3: caratteristica generale  
      4. Deep dive: un unico paragrafo di 4 frasi molto approfondite in italiano (contiene il nome della bottiglia), che includa:
         - Perché si abbina al menù  
         - Come influisce la localizzazione geografica del ristorante (regione, provincia, comune), anche per vini non locali  
         - Caratteristiche organolettiche e sensoriali (profumi, sapori, struttura), in linguaggio da sommelier  
         - Un breve invito al cliente (“Vi consigliamo di gustare questa etichetta…”)

Non includere altre chiavi. Restituisci l’array completo come JSON.

Dettagli del ristorante:
Il locale si chiama «${nome}», si trova in ${comune} (${provincia}), nella regione ${regione},  
  e rientra in una fascia di prezzo da € a €€€€€ (fascia: ${fascia}).

Testo integrale del menù (estratto dal PDF o immagine):
${menuText}

Elenco delle bottiglie selezionate:
${elencoBottiglie}
`.trim();

  let jsonResult = '[]';
  try {
    const completion = await openaiClient.chat.completions.create({
      model: 'o4-mini',
      messages: [{ role: 'user', content: prompt }],
    });
    jsonResult = completion.choices[0].message.content.trim();

    JSON.parse(jsonResult);
  } catch (e) {
    jsonResult = '[]';
  }

  return jsonResult;
}
