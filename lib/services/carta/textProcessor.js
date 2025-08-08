import fs from 'fs/promises';
import pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function processMenuFile({ filePath, fileType }) {
  let text;

  if (fileType === 'application/pdf') {
    const buffer = await fs.readFile(filePath);
    const parsed = await pdfParse(buffer);
    text = parsed.text;

  } else if (fileType.startsWith('image/')) {
    const { data: { text: ocr } } = await Tesseract.recognize(
      filePath,
      'ita+eng',
      {
        logger: m => console.log('[tesseract] ', m)
      }
    );
    text = ocr;

  } else {
    throw new Error('Formato non supportato per estrazione testo.');
  }

  const resp = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text
  });

  return { text, embedding: resp.data[0].embedding };
}
