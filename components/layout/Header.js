// components/layout/Header.js
import React, { useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'

export default function Header({ profileImageUrl }) {
  const { data: session, status } = useSession()
  const [localAvatar, setLocalAvatar] = useState(null)

  // All mount, prova a leggere l'ultimo avatar caricato da localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('profileImageUrl')
      if (stored) {
        setLocalAvatar(stored)
      }
    } catch (e) {
      // se fallisce (server o privacy), ignoriamo
    }
  }, [])

  // Sorgenti avatar in ordine di priorità:
  // 1) localStorage (ultimo upload)
  // 2) SSR prop da /user
  // 3) NextAuth session.user.image
  // 4) placeholder
  const avatarSrc =
    localAvatar ??
    profileImageUrl ??
    session?.user?.image ??
    '/user.png'

  return (
    <header className="header">
      {/* Logo al centro */}
      <div className="logo-container">
        <a href="/">
          <img src="/logo.webp" alt="Enoteca Morbin" className="logo" />
        </a>
      </div>

      {/* Link social a sinistra */}
      <div className="headerSocialLinksLeft">
        <a
          href="https://www.instagram.com/enoteca_morbin"
          target="_blank"
          rel="noopener noreferrer"
          className="socialLink"
          aria-label="Visita Instagram di Enoteca Morbin"
        >
          <img src="/instagram.png" alt="" className="socialIcon" />
        </a>
        <a
          href="https://www.facebook.com/enoteca_morbin"
          target="_blank"
          rel="noopener noreferrer"
          className="socialLink"
          aria-label="Visita Facebook di Enoteca Morbin"
        >
          <img src="/facebook.png" alt="" className="socialIcon" />
        </a>
      </div>

      {/* Area utente a destra */}
      <div className="headerSocialLinksRight">
        {status === 'loading' ? (
          <span>Loading…</span>
        ) : session ? (
          <a
            href="/user"
            className="userGreeting"
            style={{ textDecoration: 'none' }}
          >
            <span className="greetingText">Ciao,</span>{' '}
            <span className="greetingName">
              {session.user.name.split(' ')[0]}
            </span>
            <img
              src={avatarSrc}
              alt="Avatar utente"
              className="avatar-circle"
              style={{ marginLeft: '0.5rem' }}
            />
          </a>
        ) : (
        <a href="/user" className="socialLink" aria-label="Vai al profilo">
          <img
            src="/usernotauth.png"
            alt="Profilo utente"
            className="socialIcon"
          />
        </a>        )}
      </div>
    </header>
  )
}
