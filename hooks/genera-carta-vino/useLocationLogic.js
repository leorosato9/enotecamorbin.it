import { useState, useEffect } from 'react';
import { provinceByRegione, comuniByProvincia } from '../../data/locations';

export function useLocationLogic() {
  const [regione, setRegione] = useState('');
  const [provincia, setProvincia] = useState('');
  const [comune, setComune] = useState('');
  const [provinceList, setProvinceList] = useState([]);
  const [comuniList, setComuniList] = useState([]);

  useEffect(() => {
    if (regione) setProvinceList(provinceByRegione[regione] || []);
    else setProvinceList([]);
    setProvincia('');
  }, [regione]);

  useEffect(() => {
    if (provincia) setComuniList(comuniByProvincia[provincia] || []);
    else setComuniList([]);
    setComune('');
  }, [provincia]);

  return {
    regione, setRegione,
    provincia, setProvincia,
    comune, setComune,
    provinceList,
    comuniList,
  };
}
