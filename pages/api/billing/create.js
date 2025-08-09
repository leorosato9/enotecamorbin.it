import { withAuth } from '../../../lib/auth/withAuth'
import { connectToDatabase } from '../../../lib/mongodb'
import { nanoid } from 'nanoid'

async function createBillingHandler(req, res, session) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Metodo non consentito' })
  }

  const { companyName, vatNumber, address, zip, city, country } = req.body
  if (!companyName || !vatNumber || !address) {
    return res.status(400).json({ message: 'Dati mancanti' })
  }

  try {
    const { db } = await connectToDatabase()
    const id = nanoid(8)
    const billingData = {
      _id: id,
      userId: session.user.id,
      companyName: companyName.trim(),
      vatNumber: vatNumber.trim(),
      address: address.trim(),
      zip: zip?.trim() || '',
      city: city?.trim() || '',
      country: country?.trim() || 'IT',
      invoicesBucket: `billing-${id}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await db.collection('billing').insertOne(billingData)
    res.status(201).json({ success: true, billingId: id })
  } catch (err) {
    console.error('Errore creazione billing:', err)
    res.status(500).json({ success: false, message: 'Errore server' })
  }
}

export default withAuth(createBillingHandler)
