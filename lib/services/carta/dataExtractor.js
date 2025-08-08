export function extractAndValidateData({ fields, files }) {
  console.log('[dataExtractor.js] – modulo caricato fino in fondo');
  const getField = key => Array.isArray(fields[key])
    ? fields[key][0].trim()
    : (fields[key] || '').trim();

  const nome = getField('nome');
  const regione = getField('regione');
  const provincia = getField('provincia');
  const comune = getField('comune');
  const fascia = getField('fascia');

  if (!nome || !regione || !provincia || !comune || !fascia) {
    throw new Error('Campi obbligatori del form mancanti.');
  }

  const upload = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!upload || !upload.filepath) {
    throw new Error('File del menù mancante.');
  }
  
  console.log('2');

  return {
    nome,
    regione,
    provincia,
    comune,
    fascia,
    filePath: upload.filepath,
    fileType: upload.mimetype || upload.type || ''
  };
}