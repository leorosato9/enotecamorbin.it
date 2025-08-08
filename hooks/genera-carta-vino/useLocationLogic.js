import { useState, useEffect } from 'react';
// Uso i nomi delle variabili dal tuo file `data/locations.js` per coerenza
import { regioni, provinceByRegione, comuniByProvincia } from '../../data/locations';

export function useLocationLogic() {
  const [regione, setRegione] = useState('');
  const [provincia, setProvincia] = useState('');
  const [comune, setComune] = useState('');

  const [provinceList, setProvinceList] = useState([]);
  const [comuniList, setComuniList] = useState([]);

  // Questo useEffect si attiva quando la REGIONE cambia
  useEffect(() => {
    const newProvinceList = regioni.includes(regione) ? provinceByRegione[regione] || [] : [];
    setProvinceList(newProvinceList);

    // --- MODIFICA CHIAVE ---
    // Resettiamo la provincia SOLO se quella attuale non è più valida
    if (provincia && !newProvinceList.includes(provincia)) {
      setProvincia('');
    }
  }, [regione, provincia]);

  // Questo useEffect si attiva quando la PROVINCIA cambia
  useEffect(() => {
    const newComuniList = provinceList.includes(provincia) ? comuniByProvincia[provincia] || [] : [];
    setComuniList(newComuniList);

    // --- MODIFICA CHIAVE ---
    // Resettiamo il comune SOLO se quello attuale non è più valido
    if (comune && !newComuniList.includes(comune)) {
      setComune('');
    }
  }, [provincia, provinceList, comune]);

  return {
    regioni,
    regione, setRegione,
    provincia, setProvincia,
    comune, setComune,
    provinceList,
    comuniList
  };
}