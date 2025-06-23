// File: hooks/useResults.js

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function useResults() {
  const { query, isReady } = useRouter();
  const { id } = query;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [risultati, setRisultati] = useState([]);
  const [spiegazioni, setSpiegazioni] = useState([]);
  const [ristorante, setRistorante] = useState(null);
  const [menuText, setMenuText] = useState('');
  const [menuEmbedding, setMenuEmbedding] = useState([]);
  const [fileUrl, setFileUrl] = useState(null);
  const [fileType, setFileType] = useState('');
  
  const [showPreview, setShowPreview] = useState(false);
  const [openStates, setOpenStates] = useState([]);
  const [selectedWines, setSelectedWines] = useState([]);
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  const [regenerationCount, setRegenerationCount] = useState(0);
  const [regenerationLimit, setRegenerationLimit] = useState(3);

  useEffect(() => {
    if (!isReady || !id) return;

    setLoading(true);
    setError('');

    fetch(`/api/results/${Array.isArray(id) ? id.join(',') : id}`)
      .then(res => {
        if (!res.ok) return Promise.reject(res);
        return res.json();
      })
      .then(fetchedData => {
        setRistorante({ nome: fetchedData.nome, comune: fetchedData.comune, provincia: fetchedData.provincia });
        setRisultati(fetchedData.risultati || []);
        setFileUrl(fetchedData.fileUrl || null);
        setFileType(fetchedData.fileType || '');
        setMenuText(fetchedData.menuText || '');
        setMenuEmbedding(fetchedData.menuEmbedding || []);
        
        setRegenerationCount(fetchedData.regenerationCount);
        setRegenerationLimit(fetchedData.regenerationLimit);
        try {
          setSpiegazioni(typeof fetchedData.spiegazioni === 'string' ? JSON.parse(fetchedData.spiegazioni) : fetchedData.spiegazioni || []);
        } catch {
          console.error("Errore nel parsing delle spiegazioni JSON");
          setSpiegazioni([]);
        }
      })
      .catch(async (err) => {
        try {
            const errorData = await err.json();
            setError(errorData.message || `Errore nel recupero dei dati (${err.status})`);
        } catch {
            setError('Errore di rete o risposta non valida.');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, isReady]);

  useEffect(() => {
    if (risultati && risultati.length > 0) {
      setOpenStates(new Array(risultati.length).fill(false));
    }
  }, [risultati]);

  const toggleCard = (index) => {
    setOpenStates(states => states.map((s, i) => i === index ? !s : s));
  };

  const handleViewMenu = () => {
    if (!fileUrl) return;
    setShowPreview(true);
  };

  const getDotColor = (categoria) => {
    if (!categoria || typeof categoria !== 'string') return '#ccc';
    const lower = categoria.toLowerCase();
    if (lower.includes('rosso')) return '#d32f2f';
    if (lower.includes('bianco')) return '#fdd835';
    if (lower.includes('rosé')) return '#EE9A8A';
    if (lower.includes('champagne') || lower.includes('spumante')) return '#81d4fa';
    return '#ccc';
  };
  
  const handleWinesSelection = (vinoId) => {
    setSelectedWines(prev => prev.includes(vinoId) ? prev.filter(id => id !== vinoId) : [...prev, vinoId]);
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setError('');
    
    try {
      const response = await fetch('/api/rigenera-carta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartaId: id,
          risultati,
          selectedWines,
          spiegazioni,
          menuEmbedding,
          menuText,
          ristorante,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'La risposta del server non è stata positiva.');
      }

      const newData = await response.json();

      if (newData.success) {
        setRisultati(newData.risultati);
        setSpiegazioni(newData.spiegazioni);
        setRegenerationCount(prevCount => prevCount + 1);
        setSelectedWines([]);
      } else {
        throw new Error(newData.message || 'Errore durante la rigenerazione.');
      }

    } catch (err) {
      console.error("Errore durante la rigenerazione:", err);
      setError(err.message);
    } finally {
      setIsRegenerating(false);
    }
  };

  return {
    id, loading, error, risultati, spiegazioni, ristorante, fileUrl, fileType,
    showPreview, openStates, isRegenerating, selectedWines,
    regenerationCount, regenerationLimit,
    toggleCard, handleViewMenu, setShowPreview,
    getDotColor, handleWinesSelection, handleRegenerate
  };
}