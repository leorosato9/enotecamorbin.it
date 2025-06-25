import { IncomingForm } from 'formidable';
import { connectToDatabase } from '../../lib/mongodb';
import { supabaseUpload } from '../../lib/services/carta/supabaseUpload';
import fs from 'fs/promises'; // Importiamo il modulo 'fs' di Node.js per interagire con il filesystem
import path from 'path';     // Importiamo 'path' per gestire i percorsi dei file in modo sicuro

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Metodo non consentito' });
  }

  try {
    // --- AGGIUNTA FONDAMENTALE ---
    // Definiamo il percorso della cartella temporanea
    const tempDir = path.resolve('./public/uploads/temp');
    
    // Assicuriamoci che la cartella esista, creandola se necessario.
    // `recursive: true` crea anche le cartelle genitore se mancano (come `mkdir -p`).
    await fs.mkdir(tempDir, { recursive: true });
    // --- FINE AGGIUNTA ---

    const form = new IncomingForm({
      uploadDir: tempDir, // Usiamo il percorso sicuro che abbiamo appena verificato
      keepExtensions: true,
    });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });
    
    const menuFile = files.file?.[0];
    if (!menuFile) {
        return res.status(400).json({ message: 'File del menù mancante.' });
    }

    const publicUrl = await supabaseUpload(menuFile.filepath, menuFile.mimetype);

    const stagedRequest = {
      formData: {
        nome: fields.nome?.[0],
        regione: fields.regione?.[0],
        provincia: fields.provincia?.[0],
        comune: fields.comune?.[0],
        fascia: fields.fascia?.[0],
      },
      fileUrl: publicUrl,
      fileType: menuFile.mimetype,
      status: 'in_attesa_di_login',
      createdAt: new Date(),
    };

    const { db } = await connectToDatabase();
    const result = await db.collection('richiesteInAttesa').insertOne(stagedRequest);

    res.status(200).json({ stagingId: result.insertedId });

  } catch (error) {
    console.error('Errore durante la creazione della richiesta temporanea:', error);
    res.status(500).json({ message: 'Errore durante l\'elaborazione della richiesta.' });
  }
}