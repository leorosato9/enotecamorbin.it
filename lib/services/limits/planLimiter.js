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