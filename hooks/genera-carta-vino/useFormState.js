import { useState, useMemo } from 'react';

export function useFormState() {
  const [nome, setNome] = useState('');
  const [fascia, setFascia] = useState('');
  const [filePdf, setFilePdf] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const fileURL = useMemo(() => (filePdf ? URL.createObjectURL(filePdf) : null), [filePdf]);
  
  const handleFileChange = (e) => {
    setFilePdf(e.target.files?.[0] ?? null);
    setShowDetails(false);
    setShowPreview(false);
  };

  const handleChangeMenu = () => {
    setFilePdf(null);
    setShowDetails(false);
    setShowPreview(false);
  };

  const handleViewMenu = () => {
    if (filePdf) setShowPreview(true);
  };

  return {
    nome, setNome,
    fascia, setFascia,
    filePdf,
    loading, setLoading,
    error, setError,
    showDetails, setShowDetails,
    showPreview, setShowPreview,
    fileURL,
    handleFileChange,
    handleChangeMenu,
    handleViewMenu,
  };
}
