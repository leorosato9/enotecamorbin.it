// Importa le dipendenze
const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

// Middleware
app.use(bodyParser.json());

// Configura il middleware CORS
const corsOptions = {
  origin: ['https://enotecamorbin.it'], // Solo domini HTTPS consentiti
  methods: ['GET', 'POST', 'OPTIONS'], // Metodi consentiti
  allowedHeaders: ['Content-Type'], // Header consentiti
  credentials: true, // Permetti invio di credenziali se necessario
};
app.use(cors(corsOptions));

// Forza HTTPS
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});

// Rispondi alle richieste preflight
app.options('*', cors(corsOptions));

// Configura Nodemailer
const transporter = nodemailer.createTransport({
  service: 'Gmail', // Cambia con il provider che usi (es. Outlook, Yahoo)
  auth: {
    user: process.env.EMAIL_USER, // Usa variabili d'ambiente per maggiore sicurezza
    pass: process.env.EMAIL_PASS,
  },
});

// Endpoint per gestire l'invio delle email
app.post('/send-email', (req, res) => {
  const { email, contenuto } = req.body;

  // Validazione degli input
  if (!email || !contenuto) {
    return res.status(400).send('Email e contenuto sono obbligatori.');
  }

  const mailOptions = {
    from: process.env.EMAIL_USER, // Usa sempre la tua email come mittente
    replyTo: email, // Indirizzo a cui rispondere
    to: process.env.EMAIL_USER, // Destinatario (la tua email)
    subject: 'Enoteca Morbin // Form di Contatto',
    text: `Email: ${email}\n\nMessaggio:\n${contenuto}`,
  };

  // Invio email con Nodemailer
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Errore durante l\'invio dell\'email:', error);
      res.status(500).send('Errore durante l\'invio del messaggio.');
    } else {
      console.log('Email inviata: ' + info.response);
      res.status(200).send('Email inviata con successo!');
    }
  });
});

// Avvia il server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});
