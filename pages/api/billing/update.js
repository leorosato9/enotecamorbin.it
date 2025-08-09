// pages/api/billing/update.js
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

function sanitizeBilling(input = {}) {
  const address = input.address || {};
  return {
    companyName: (input.companyName || '').trim(),
    taxId: input.taxId?.trim() || null,                 // P.IVA
    codiceUnivoco: input.codiceUnivoco?.trim() || null, // Codice Destinatario
    pec: input.pec?.trim() || null,
    fiscalCode: input.fiscalCode?.trim() || null,       // CF se serve
    address: {
      street: address.street?.trim() || '',
      line2: address.line2?.trim() || null,
      postal_code: address.postal_code?.trim() || '',
      city: address.city?.trim() || '',
      province: address.province?.trim() || null,
      country: (address.country || 'IT').toUpperCase(),
    },
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id || !session?.user?.email) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { billing } = req.body || {};
    if (!billing) return res.status(400).json({ error: 'Missing billing payload' });

    const clean = sanitizeBilling(billing);

    const { db } = await connectToDatabase();
    const userId = new ObjectId(String(session.user.id));
    const email = session.user.email.toLowerCase();

    // Aggiorna sul documento utente
    const updatedAt = new Date();
    const result = await db.collection('utenti').updateOne(
      { _id: userId },
      { $set: { billingProfile: { ...clean, updatedAt } } }
    );

    // (facoltativo ma utile) mantieni una copia "latest" in billing
    await db.collection('billing').updateOne(
      { userId },
      {
        $set: {
          userId,
          userEmail: email,
          ...clean,
          updatedAt,
        }
      },
      { upsert: true }
    );

    // Risposta serializzabile
    return res.json({
      ok: true,
      billingProfile: { ...clean, updatedAt: updatedAt.toISOString() }
    });
  } catch (e) {
    console.error('billing/update error:', e);
    return res.status(400).json({ error: e.message || 'Update failed' });
  }
}
