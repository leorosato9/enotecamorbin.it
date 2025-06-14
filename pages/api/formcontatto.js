import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Metodo non consentito' });
  }

  const { email, contenuto } = req.body;

  if (!email || !contenuto) {
    return res.status(400).json({ message: 'Email e contenuto sono obbligatori.' });
  }

  // Configura il transporter con l’app password Gmail o OAuth2
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // consigliato: usare un’app password generata da Google
    },
  });

  // Definizione del contenuto email, sia in testo semplice che in HTML
  const mailOptions = {
    from: process.env.EMAIL_USER,
    replyTo: email,
    to: process.env.EMAIL_USER,
    subject: 'Enoteca Morbin // Form di Contatto',
    text: `Email: ${email}\n\nMessaggio:\n${contenuto}`,
    html: `
      <div>
        <h2>Nuovo messaggio da form di contatto</h2>
        <p><strong>Email mittente:</strong> ${email}</p>
        <p><strong>Testo del messaggio:</strong><br>
        ${contenuto.replace(/\n/g, '<br>')}</p>
        <hr>
        <p>
          Questo messaggio è stato inviato automaticamente dal form di contatto sul sito.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: 'Email inviata con successo!' });
  } catch (error) {
    console.error('Errore invio email:', error);
    return res.status(500).json({ message: 'Errore durante l\'invio del messaggio.' });
  }
}
