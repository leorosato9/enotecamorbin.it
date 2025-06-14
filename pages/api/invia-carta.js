import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method not allowed');
  }

  try {
    const { email, ristorante, localizzazione, vini } = req.body;

    // 1. Prepara i dati da inviare a PDFMonkey
    const response = await fetch('https://api.pdfmonkey.io/api/v1/documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PDFMONKEY_API_KEY}`
      },
      body: JSON.stringify({
        document: {
          template_id: process.env.PDFMONKEY_TEMPLATE_ID,
          payload: {
            email,
            ristorante,
            localizzazione,
            vini
          }
        }
      })
    });

    const pdfResult = await response.json();

    if (!response.ok) {
      console.error('Errore PDFMonkey:', pdfResult);
      return res.status(500).json({ error: 'Errore generazione PDF' });
    }

    // 2. Attendi che il PDF sia pronto
    const documentId = pdfResult.data.id;

    // poll per il file generato
    let downloadUrl = null;
    for (let i = 0; i < 10; i++) {
      const check = await fetch(`https://api.pdfmonkey.io/api/v1/documents/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.PDFMONKEY_API_KEY}`
        }
      });
      const checkData = await check.json();
      if (checkData.data.attributes.download_url) {
        downloadUrl = checkData.data.attributes.download_url;
        break;
      }
      await new Promise(r => setTimeout(r, 1000)); // aspetta 1s
    }

    if (!downloadUrl) {
      return res.status(500).json({ error: 'PDF non pronto' });
    }

    // 3. Scarica il PDF come buffer
    const pdfResponse = await fetch(downloadUrl);
    const pdfBuffer = await pdfResponse.arrayBuffer();

    // 4. Invia la mail con allegato
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Carta dei Vini" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `La tua carta dei vini per ${ristorante}`,
      text: 'In allegato trovi la tua carta dei vini personalizzata.',
      attachments: [
        {
          filename: 'Carta-dei-vini.pdf',
          content: Buffer.from(pdfBuffer),
        },
      ],
    });

    res.status(200).json({ message: 'Email inviata con successo' });

  } catch (error) {
    console.error('Errore invio email:', error);
    res.status(500).json({ error: 'Errore nel server' });
  }
}
