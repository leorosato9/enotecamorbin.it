import { getSession } from "next-auth/react";
import { connectToDatabase } from "../../../lib/mongodb";
import { ObjectId } from 'mongodb';
import { PLAN_CONFIG } from "../../../lib/config/plans";

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session || !session.user) {
    return res.status(401).json({ message: "Utente non autenticato." });
  }

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id) {
    return res.status(400).json({ message: "ID non fornito." });
  }

  const { db } = await connectToDatabase();
  const record = await db.collection("cartavini").findOne({ _id: id });

  if (!record) {
    return res.status(404).json({ message: "Carta non trovata." });
  }

  console.log("[API /api/carta-vino/:id] attivitaId nel record:", record.attivitaId);
  console.log("[API /api/carta-vino/:id] _id record carta:", record._id);


  const userPlan = record.userPlan || "free";
  const defaultLimit = PLAN_CONFIG[userPlan]?.limits?.regenerationsPerMenu || 0;

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  return res.status(200).json({
    status: record.status,
    attivitaId: record.attivitaId ? record.attivitaId.toString() : null, // ✅ aggiunto
    ristorante: record.formData,
    risultati: record.risultati,
    spiegazioni: record.spiegazioni,
    menuText: record.menuText,
    menuEmbedding: record.menuEmbedding,
    fileUrl: record.fileUrl,
    fileType: record.fileType,
    regenerationLimit: typeof record.regenerationLimit === 'number'
      ? record.regenerationLimit
      : defaultLimit,
    regenerationCount: typeof record.regenerationCount === 'number'
      ? record.regenerationCount
      : 0
  })

}