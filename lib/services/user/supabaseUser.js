// lib/services/user/supabaseuser.js
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import fs from 'fs/promises'
import path from 'path'


export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
  }
)

export async function uploadFileToSupabase(filePath, mimetype, bucket = 'avatars') {
  // 1. Leggi il buffer
  const buffer = await fs.readFile(filePath)

  // 2. Estrai estensione e genera filename univoco
  const ext = path.extname(filePath) || `.${mimetype.split('/')[1]}`
  const filename = `${randomUUID()}${ext}`

  // 3. Carica sul bucket
  const { error: uploadError } = await supabase
    .storage
    .from(bucket)
    .upload(filename, buffer, { contentType: mimetype })

  if (uploadError) {
    throw uploadError
  }

  // 4. Ottieni URL pubblico
  const { data } = supabase
    .storage
    .from(bucket)
    .getPublicUrl(filename)

  return data.publicUrl
}
