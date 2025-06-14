import fs from 'fs/promises';
import { IncomingForm } from 'formidable';
import OpenAI from 'openai';
import { withAuth } from '../../lib/auth/withAuth';

export const config = { api: { bodyParser: false } };

async function chatHandler(req, res, session) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const form = new IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Errore interno durante parsing form' });
    }
    
    const nomeArr = Array.isArray(fields.nome) ? fields.nome[0] : fields.nome;
    const descrArr = Array.isArray(fields.descrizione) ? fields.descrizione[0] : fields.descrizione;
    const regioneArr = Array.isArray(fields.regione) ? fields.regione[0] : fields.regione;
    const provinciaArr = Array.isArray(fields.provincia) ? fields.provincia[0] : fields.provincia;
    const comuneArr = Array.isArray(fields.comune) ? fields.comune[0] : fields.comune;
    const fasciaArr = Array.isArray(fields.fascia) ? fields.fascia[0] : fields.fascia;

    if (!nomeArr || !descrArr || !regioneArr || !provinciaArr || !comuneArr || !fasciaArr) {
      return res.status(400).json({ error: 'Campi obbligatori mancanti' });
    }

    let uploadedFile = files.file ? (Array.isArray(files.file) ? files.file[0] : files.file) : null;

    if (!uploadedFile || !uploadedFile.filepath) {
      return res.status(400).json({ error: 'Nessun file PDF trovato.' });
    }

    const pdfMimeType = uploadedFile.mimetype || uploadedFile.type;
    if (pdfMimeType !== 'application/pdf') {
      return res.status(400).json({ error: 'Formato non supportato: carica un file PDF.' });
    }

    try {
      const data = await fs.readFile(uploadedFile.filepath);
      const pdfBase64 = `data:${pdfMimeType};base64,${data.toString('base64')}`;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const prompt = `Dettagli: nome: ${nomeArr}, descr: ${descrArr}, regione: ${regioneArr}, provincia: ${provinciaArr}, comune: ${comuneArr}, fascia: ${fasciaArr}. PDF: ${pdfBase64}`.trim();
      
      const completion = await openai.chat.completions.create({
        model: "o4-mini",
        messages: [{ role: 'user', content: prompt }]
      });

      const aiResponse = completion.choices[0].message.content;
      return res.status(200).json({ result: aiResponse });

    } catch (apiErr) {
      console.error('API error:', apiErr);
      return res.status(500).json({ error: 'Errore nella chiamata a OpenAI o nella lettura del file' });
    }
  });
}

export default withAuth(chatHandler);