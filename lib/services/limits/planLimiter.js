import { PLAN_CONFIG } from '../../config/plans.js';

export async function checkRestaurantLimit(db, userId, userPlan) {
  const limit = PLAN_CONFIG[userPlan]?.limits.restaurants;

  if (typeof limit !== 'number' || limit === Infinity) {
    return;
  }

  const count = await db.collection('attività').countDocuments({ userId: userId });
    
  if (count >= limit) {
    let message = `Hai raggiunto il limite di ${limit} ristoranti per il piano ${PLAN_CONFIG[userPlan].name}.`;
      
      if (userPlan === 'free') {
        message += " Fai l'upgrade a Plus per aggiungerne altri!";
      }

      const error = new Error(message);
      error.statusCode = 403;
      throw error;
  }
}

export async function getMenuPerWeekStatus(db, userId, userPlan) {
    const limit = PLAN_CONFIG[userPlan]?.limits.menusPerWeek;

    if (typeof limit !== 'number' || limit === Infinity) {
        return { allowed: true };
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const count = await db.collection('cartavini').countDocuments({
        userId: userId,
        createdAt: { $gte: oneWeekAgo },
    });

    if (count >= limit) {
        let message = `Hai raggiunto il limite di ${limit} carta dei vini a settimana per il piano ${PLAN_CONFIG[userPlan].name}.`;
        if (userPlan === 'free') {
            message += " Fai l'upgrade o attendi per crearne di nuove!";
        }
        return { allowed: false, message: message };
    }

    return { allowed: true };
}


export async function checkMenuPerWeekLimit(db, userId, userPlan) {
  const status = await getMenuPerWeekStatus(db, userId, userPlan);
  if (!status.allowed) {
    const error = new Error(status.message);
    error.statusCode = 403;
    throw error;
  }
}