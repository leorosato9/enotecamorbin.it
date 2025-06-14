export async function parseForm(req) {
  return new Promise((resolve, reject) => {
    const { IncomingForm } = require('formidable');
    const form = new IncomingForm({ keepExtensions: true, multiples: false });

    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(new Error('Errore durante il parsing del form.'));
      }
      resolve({ fields, files });
    });
  });
}