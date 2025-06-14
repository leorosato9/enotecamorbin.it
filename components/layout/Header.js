import React, { useState } from 'react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleMouseEnter = () => {
    setIsMenuOpen(true); // Mostra la finestra
  };

  const handleMouseLeave = () => {
    setIsMenuOpen(false); // Nascondi la finestra
  };

  return (
    <header className="header">

      {/* Logo */}
      <div className="logo-container">
        <a href="/">
          <img
            src="/logo.webp"
            alt="Enoteca Morbin Trieste"
            className="logo"
          />
        </a>
      </div>

      {/* Social Links */}
      <div className="headerSocialLinks">
        
        {/* Icona Utente
        <a
          href="/user"
          className="socialLink"
        >
          <img
            src="/user.png"
            alt="Instagram"
            className="socialIcon"
          />
        </a>  
        */}     
       
        <a
          href="https://www.instagram.com/enoteca_morbin"
          target="_blank"
          rel="noopener noreferrer"
          className="socialLink"
        >
          <img
            src="/instagram.png"
            alt="Instagram"
            className="socialIcon"
          />
        </a>
        <a
          href="https://www.facebook.com/enoteca_morbin"
          target="_blank"
          rel="noopener noreferrer"
          className="socialLink"
        >
          <img
            src="/facebook.png"
            alt="Facebook"
            className="socialIcon"
          />
        </a>
      </div>
    </header>
  );
}
