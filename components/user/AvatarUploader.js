// components/user/AvatarUploader.js
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'

export default function AvatarUploader() {
  const { data: session, status } = useSession()
  const [preview, setPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const router = useRouter()

  // Carico in preview prima di tutto il valore da localStorage (se c'è),
  // altrimenti quello da session.user.image
  useEffect(() => {
    try {
      const stored = localStorage.getItem('profileImageUrl')
      if (stored) {
        setPreview(stored)
        return
      }
    } catch (e) {
      // ignore
    }
    if (session?.user?.image) {
      setPreview(session.user.image)
    }
  }, [session])

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return

    setUploading(true)
    const form = new FormData()
    form.append('avatar', file)

    try {
      const res = await fetch('/api/user/upload-avatar', {
        method: 'POST',
        credentials: 'include',
        body: form,
      })
      if (!res.ok) throw new Error('Upload failed')
      const { url } = await res.json()

      // 1) Mostro subito in anteprima
      setPreview(url)
      // 2) Salvo in localStorage per renderlo disponibile ovunque
      try {
        localStorage.setItem('profileImageUrl', url)
      } catch {}

      // 3) Ricarico la pagina (o sessione) per aggiornare Header ecc.
      router.replace(router.asPath)
    } catch (err) {
      console.error(err)
      alert("Errore durante l'upload dell'avatar.")
    } finally {
      setUploading(false)
    }
  }

  if (status === 'loading') {
    return <p>Loading profile…</p>
  }
  if (!session) {
    return <p>Devi essere autenticato per caricare un avatar.</p>
  }

  return (
    <div className="avatar-uploader" style={{ textAlign: 'center' }}>
      {/* Anteprima */}
      {preview && (
        <div style={{ marginBottom: '0.5rem' }}>
          <img
            src={preview}
            alt="Anteprima Avatar"
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              objectFit: 'cover',
              opacity: uploading ? 0.6 : 1,
            }}
          />
        </div>
      )}

      {/* Solo la scritta cliccabile */}
      <label
        style={{
          cursor: uploading ? 'not-allowed' : 'pointer',
          display: 'inline-block',
          color: '#0070f3',
          textDecoration: 'underline',
        }}
      >
        {uploading ? 'Caricamento...' : 'Cambia immagine'}
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: 'none' }}
        />
      </label>
    </div>
  )
}
