// pages/api/user/upload-avatar.js

import multer from 'multer'
import fs from 'fs/promises'
import { uploadFileToSupabase } from '../../../lib/services/user/supabaseUser'
import { connectToDatabase } from '../../../lib/mongodb'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'

const upload = multer({ storage: multer.memoryStorage() })
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, err => (err ? reject(err) : resolve()))
  })
}

export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  await runMiddleware(req, res, upload.single('avatar'))

  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const ext = req.file.mimetype.split('/')[1]
    const tmpPath = `/tmp/${Date.now()}.${ext}`
    await fs.writeFile(tmpPath, req.file.buffer)

    const publicUrl = await uploadFileToSupabase(tmpPath, req.file.mimetype)

    const { db } = await connectToDatabase()
    await db
      .collection('utenti')
      .updateOne(
        { email: session.user.email.toLowerCase() },
        { $set: { profileImageUrl: publicUrl } }
      )

    return res.status(200).json({ url: publicUrl })
  } catch (err) {
    console.error('Upload-avatar error:', err)
    return res.status(500).json({ message: 'Upload error' })
  }
}
