// pages/api/degustazione[id].js

import multer from 'multer';
import { connectToDatabase } from '../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

// Configura multer per salvare i file in /public/uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    },
  }),
});

// Disabilita il bodyParser di Next.js per consentire a multer di gestire FormData
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Esegui multer per gestire l’upload del singolo campo "image"
  await new Promise((resolve, reject) => {
    upload.single('image')(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  try {
    // Verifica la sessione con NextAuth
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: 'Non autenticato' });
    }

    const { id } = req.query;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID non valido' });
    }

    const {
      titolo,
      descrizione,
      data,
      calici,
      postiDisponibili,
      slug,
      cantina,
      nome,
      foto,
      link,
      cicchetto,
    } = req.body;

    // Se multer ha gestito l'upload, req.file contiene info del file
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    // Validazione minima: tutti i campi obbligatori
    if (
      !titolo ||
      !descrizione ||
      !data ||
      !calici ||
      !postiDisponibili ||
      !slug ||
      !cantina ||
      !nome ||
      !foto
    ) {
      return res.status(400).json({ error: 'Tutti i campi sono obbligatori.' });
    }

    const { db } = await connectToDatabase();
    const objectId = new ObjectId(id);

    const updateData = {
      titolo,
      descrizione,
      data,
      calici,
      postiDisponibili: parseInt(postiDisponibili, 10),
      slug: slug.trim(),
      cantina,
      nome,
      foto,
      updatedAt: new Date(),
      cicchetto: cicchetto === 'true',
    };
    if (imagePath) updateData.imagePath = imagePath;
    if (link) updateData.link = link;

    const result = await db.collection('degustazioni').findOneAndUpdate(
      { _id: objectId },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({ error: 'Degustazione non trovata.' });
    }

    return res.status(200).json(result.value);
  } catch (error) {
    console.error("Errore durante l'aggiornamento della degustazione:", error);
    return res.status(500).json({ error: 'Errore interno del server.' });
  }
}
