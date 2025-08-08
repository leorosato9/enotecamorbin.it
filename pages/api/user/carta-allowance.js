import { getSession } from 'next-auth/react';
import { getCartaLast7Days }      from '../../../lib/services/limits/getCartaLast7Days';
import { PLAN_CONFIG } from '../../../lib/config/plans';

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session?.user) {
    return res
      .status(401)
      .json({ canCreateMenu: false, message: 'Utente non autenticato.' });
  }

  const userId   = session.user.id;
  const userPlan = session.user.plan || 'free';
  const weeklyLimit = PLAN_CONFIG[userPlan].limits.menusPerWeek;

  try {
    const generatedLast7Days = await getCartaLast7Days(userId);
    console.log('[carta-allowance] 🕒 carte ultime 7 giorni:', generatedLast7Days);
    console.log('[carta-allowance] ⚙️ limite settimanale:', weeklyLimit);
    if (generatedLast7Days >= weeklyLimit) {
      return res.status(200).json({
        canCreateMenu: false,
        message: `Hai raggiunto il limite di carte vino generate per il tuo piano(${weeklyLimit}).`
      });
    }

    return res.status(200).json({ canCreateMenu: true, message: '' });
  } catch (error) {
    console.error('[carta-allowance] errore:', error);
    return res.status(500).json({
      canCreateMenu: false,
      message: 'Si è verificato un errore nel controllo delle carte.'
    });
  }
}
