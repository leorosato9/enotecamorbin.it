import { getSession } from "next-auth/react";
import { connectToDatabase } from "../../../lib/mongodb";
import { PLAN_CONFIG } from "../../../lib/config/plans";
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session || !session.user) {
    return res.status(401).json({ message: "Utente non autenticato." });
  }

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const { db } = await connectToDatabase();

  const record = await db.collection("cartavini").findOne({ _id: id });
  if (!record) {
    return res.status(404).json({ message: "Carta non trovata." });
  }

  const userPlan = session.user.plan || "free";
  const defaultLimit = PLAN_CONFIG[userPlan]?.limits?.regenerationsPerMenu || 0;

  const regenerationLimit = typeof record.regenerationLimit === "number" ? record.regenerationLimit : defaultLimit;
  const regenerationCount = typeof record.regenerationCount === "number" ? record.regenerationCount : 0;

  // --- MODIFICA RICHIESTA: Log nel terminale ---
  console.log(`[API RESULT] Carta ${id} - Rigenerazioni usate: ${regenerationCount} di ${regenerationLimit}`);

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  return res.status(200).json({
    ristorante: {
      nome: record.nomeLocale,
      regione: record.regione,
      provincia: record.provincia,
      comune: record.comune,
      fascia: record.fascia,
    },
    risultati: record.risultati,
    spiegazioni: record.spiegazioni,
    menuText: record.menuText,
    menuEmbedding: record.menuEmbedding,
    fileUrl: record.fileUrl,
    fileType: record.fileType,
    regenerationLimit,
    regenerationCount
  });
}