// components/billing/BillingInfoEditable.js
import React, { memo, useMemo, useState } from 'react';

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className="input"
      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd' }}
    />
  );
}

function safe(val, fallback = '—') {
  if (val === 0) return 0;
  return val ? String(val) : fallback;
}
function formatAddress(addr = {}) {
  const parts = [
    addr.street,
    addr.line2,
    [addr.postal_code, addr.city].filter(Boolean).join(' '),
    addr.province,
    addr.country,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

/**
 * Props:
 * - initialBilling: { companyName, taxId, codiceUnivoco, pec, fiscalCode, address:{...}, updatedAt? }
 * - onSaved?: (billingProfile) => void
 */
function BillingInfoEditable({ initialBilling, onSaved }) {
  const start = useMemo(() => ({
    companyName: initialBilling?.companyName || '',
    taxId: initialBilling?.taxId || '',
    codiceUnivoco: initialBilling?.codiceUnivoco || '',
    pec: initialBilling?.pec || '',
    fiscalCode: initialBilling?.fiscalCode || '',
    address: {
      street: initialBilling?.address?.street || '',
      line2: initialBilling?.address?.line2 || '',
      postal_code: initialBilling?.address?.postal_code || '',
      city: initialBilling?.address?.city || '',
      province: initialBilling?.address?.province || '',
      country: initialBilling?.address?.country || 'IT',
    },
  }), [initialBilling]);

  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(start);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  function onChange(e) {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const key = name.split('.')[1];
      setForm(s => ({ ...s, address: { ...s.address, [key]: value } }));
    } else {
      setForm(s => ({ ...s, [name]: value }));
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true); setMsg('');
    try {
      const r = await fetch('/api/billing/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billing: form })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Salvataggio non riuscito');

      setEdit(false);
      setMsg('Salvato ✅');
      if (onSaved) onSaved(data.billingProfile);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(''), 3000);
    }
  }

  function onCancel() {
    setForm(start);
    setEdit(false);
    setMsg('');
  }

  return (
    <div className="billingInfo" style={{ padding: 16, border: '1px solid #eee', borderRadius: 12 }}>
      <h3 style={{ marginTop: 0 }}>Dati di fatturazione</h3>

      {!edit ? (
        <>
          {initialBilling ? (
            <>
              <p><strong>Intestazione:</strong> {safe(initialBilling.companyName)}</p>
              <p><strong>Partita IVA:</strong> {safe(initialBilling.taxId)}</p>
              <p><strong>Codice Destinatario:</strong> {safe(initialBilling.codiceUnivoco || '0000000')}</p>
              <p><strong>PEC:</strong> {safe(initialBilling.pec)}</p>
              <p><strong>Codice Fiscale:</strong> {safe(initialBilling.fiscalCode)}</p>
              <p><strong>Indirizzo:</strong> {formatAddress(initialBilling.address)}</p>
              {initialBilling.updatedAt && (
                <p style={{ opacity: 0.7 }}>
                  <em>Aggiornato il {new Date(initialBilling.updatedAt).toLocaleDateString('it-IT')}</em>
                </p>
              )}
            </>
          ) : (
            <p style={{ opacity: 0.7 }}>Nessun dato di fatturazione impostato.</p>
          )}

          <button onClick={() => setEdit(true)} className="submitButton customBuyButton" style={{ marginTop: 12 }}>
            Modifica
          </button>
          {msg && <div style={{ marginTop: 8 }}>{msg}</div>}
        </>
      ) : (
        <form onSubmit={onSubmit}>
          <Field label="Intestazione (Ragione sociale / Nome e Cognome)">
            <TextInput name="companyName" value={form.companyName} onChange={onChange} required />
          </Field>
          <Field label="Partita IVA">
            <TextInput name="taxId" value={form.taxId} onChange={onChange} placeholder="IT..." />
          </Field>
          <Field label="Codice Destinatario">
            <TextInput name="codiceUnivoco" value={form.codiceUnivoco} onChange={onChange} placeholder="0000000 se privato" />
          </Field>
          <Field label="PEC">
            <TextInput name="pec" value={form.pec} onChange={onChange} />
          </Field>
          <Field label="Codice Fiscale (se persona fisica)">
            <TextInput name="fiscalCode" value={form.fiscalCode} onChange={onChange} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Via e numero">
              <TextInput name="address.street" value={form.address.street} onChange={onChange} />
            </Field>
            <Field label="Interno / Scala (opz.)">
              <TextInput name="address.line2" value={form.address.line2} onChange={onChange} />
            </Field>
            <Field label="CAP">
              <TextInput name="address.postal_code" value={form.address.postal_code} onChange={onChange} />
            </Field>
            <Field label="Città">
              <TextInput name="address.city" value={form.address.city} onChange={onChange} />
            </Field>
            <Field label="Provincia">
              <TextInput name="address.province" value={form.address.province} onChange={onChange} />
            </Field>
            <Field label="Paese">
              <TextInput name="address.country" value={form.address.country} onChange={onChange} />
            </Field>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="submit" disabled={busy} className="submitButton customBuyButton">
              {busy ? 'Salvataggio…' : 'Salva'}
            </button>
            <button type="button" onClick={onCancel} disabled={busy} className="submitButton slugButton">
              Annulla
            </button>
          </div>
          {msg && <div style={{ marginTop: 8 }}>{msg}</div>}
        </form>
      )}
    </div>
  );
}

export default memo(BillingInfoEditable);
