export const PLAN_CONFIG = {
  free: {
    name: "Free",
    limits: {
      restaurants: 2,
      menusPerWeek: 1,
      regenerationsPerMenu: 3,
    },
    features: {
    }
  },
  plus: {
    name: "Plus",
    limits: {
      restaurants: 3,
      menusPerWeek: Infinity, 
      regenerationsPerMenu: 5,
    },
    features: {
    }
  },
};
