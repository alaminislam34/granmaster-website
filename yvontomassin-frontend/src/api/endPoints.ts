export const ENDPOINTS = {
  BASEURL: process.env.NEXT_PUBLIC_API_URL,

  // Auth
  register: '/auth/register',
  resendVerification: '/auth/resend-verification',
  verifyEmail: '/auth/verify-email',
  login: '/auth/login',
  refreshToken: '/auth/refresh-token',
  forgetPassword: '/auth/forget-password',
  verifyCode: '/auth/code-verify',
  resetPassword: '/auth/reset-password',
  changePassword: '/auth/change-password',
  logout: '/auth/logout',

  // User / Profile
  userMe: '/user/me',
  userById: '/user',          // PATCH /user/:id  |  GET /user/:id  |  DELETE /user/:id
  users: '/user',             // GET /user  (all users)

  // Nutrition
  nutrition: '/nutrition',
  nutritionCreate: '/nutrition/create',

  // Cheat Meals
  cheat: '/cheat',
  cheatCreate: '/cheat/create',

  // Meal Planner
  mealPlannerMeals: '/mealPlanner/meals',
  mealPlannerMealsCreate: '/mealPlanner/meals/create',
  mealPlannerGenerate: '/mealPlanner/plans/generate',
  mealPlannerVariante: '/mealPlanner/plans/variante',
  mealPlannerCheatDay: '/mealPlanner/plans/cheat-day',
  mealPlannerRemoveCheat: '/mealPlanner/plans/remove-cheat',
  mealPlannerTodayPlan: '/mealPlanner/plans/today',
  mealPlannerUserPlans: '/mealPlanner/plans/user',
  mealPlannerPlanById: '/mealPlanner/plans',
};
