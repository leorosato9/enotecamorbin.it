import { IncomingForm } from 'formidable';
import { connectToDatabase } from '../../lib/mongodb';
import { supabaseUpload } from '../../lib/services/carta/supabaseUpload';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Metodo non consentito' });
  }

  
  const form = new IncomingForm({
      uploadDir: '/tmp',
      keepExtensions: true,
  });

  try {
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