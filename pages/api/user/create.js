import bcrypt from 'bcryptjs';
import { connectToDatabase } from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Metodo non consentito' });
  }

  const { nome, cognome, email, password, telefono } = req.body;

  if (!nome || !cognome || !email || !password || !telefono) {
    return res.status(400).json({ message: 'Tutti i campi sono obbligatori' });
  }

  try {
    const { db } = await connectToDatabase();
    const emailPulita = email.toLowerCase().trim();

    const existing = await db.collection('utenti').findOne({ email: emailPulita });
    if (existing) {
      return res.status(409).json({ message: 'Email già registrata' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const nuovoUtente = {
      nome: nome.trim(),
      cognome: cognome.trim(),
      email: emailPulita,
      passwordHash,
      telefono: telefono.trim(),
      plan: 'free',
      createdAt: new Date(),
    };

    await db.collection('utenti').insertOne(nuovoUtente);

    return res.status(201).json({ message: 'Utente registrato con successo.' });
  } catch (err) {
    console.error('Errore in /api/user/create:', err);
    return res.status(500).json({ message: 'Errore interno del server' });
  }
}
