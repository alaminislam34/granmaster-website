import { Router } from 'express';
import authRouter from '../app/modules/auth/auth.route';
import userRouter from '../app/modules/user/user.route';
import taskRoute from '../app/modules/task/task.route';
import oauthRouter from '../app/modules/auth/oauth.route';
import nutritionRouter from '../app/modules/nutrition/nutrition.route';
import cheatRouter from '../app/modules/cheat/cheat.route';
import mealPlannerRouter from '../app/modules/mealplanner/mealplanner.route';
import imageRouter from '../app/modules/image/image.route';

const router = Router();

const moduleRoutes = [
  {
    path: '/auth',
    route: authRouter,
  },
  {
    path: '/user',
    route: userRouter,
  },
  {
    path: '/task',
    route: taskRoute,
  },
  {
    path: '/oauth',
    route: oauthRouter,
  },
  {
    path: '/nutrition',
    route: nutritionRouter,
  },
  {
    path: '/cheat',
    route: cheatRouter,
  },
  {
    path: '/mealPlanner',
    route: mealPlannerRouter,
  },
  {
    path: '/images',
    route: imageRouter,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
