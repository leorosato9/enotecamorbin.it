import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';

export async function supabaseUpload(filePath, mimetype) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(process.env.SUPABASE_URL, key);
  const buffer = await fs.readFile(filePath);
  const ext = filePath.split('.').pop();
  const { randomUUID } = require('crypto');
  const filename = `${randomUUID()}.${ext}`;

  await supabase.storage.from('menus').upload(filename, buffer, { contentType: mimetype });

  const { data } = supabase.storage.from('menus').getPublicUrl(filename);
  
  return data.publicUrl;
}