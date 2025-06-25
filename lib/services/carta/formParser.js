// formParser.js

export async function parseForm(req) {
  console.log('[formParser] ▶️ parseForm start', { url: req.url });
  try {
    const { IncomingForm } = require('formidable');
    const form = new IncomingForm({ keepExtensions: true, multiples: false });

    const result = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('[formParser] ❌ parseForm parse error', err);
          return reject(new Error('Errore durante il parsing del form.'));
        }
        resolve({ fields, files });
      });
    });

    console.log('[formParser] ✅ parseForm end', {
      fields: Object.keys(result.fields),
      files: Object.keys(result.files),
    });
    return result;
  } catch (err) {
    console.error('[formParser] ❌ parseForm error', err);
    throw err;
  }
}
