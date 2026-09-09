import { Router } from 'express';
import { mealPlannerController } from './mealplanner.controller';
import { MealPlannerValidation } from './mealplanner.validation';
import validateRequest from '../../../middlewares/validateRequest';
import { imageUpload } from '../../../middlewares/imageUpload';
import parseBodyData from '../../../middlewares/parseBodyData';

const mealPlannerRouter = Router();

// Meal routes. Base: /api/mealPlanner/meals
mealPlannerRouter.post(
  '/meals/create',
  imageUpload.single('image'),
  parseBodyData,
  validateRequest(MealPlannerValidation.createMealValidation),
  mealPlannerController.createMeal
);

mealPlannerRouter.get('/meals', mealPlannerController.getAllMeals);
mealPlannerRouter.get('/meals/by-range/:range', mealPlannerController.getMealsByCalorieRange);
mealPlannerRouter.get('/meals/:id', mealPlannerController.getSingleMeal);

mealPlannerRouter.patch(
  '/meals/:id',
  imageUpload.single('image'),
  parseBodyData,
  validateRequest(MealPlannerValidation.updateMealValidation),
  mealPlannerController.updateMeal
);

mealPlannerRouter.delete('/meals/:id', mealPlannerController.deleteMeal);

// Plan routes. Base: /api/mealPlanner/plans
mealPlannerRouter.post(
  '/plans/generate',
  validateRequest(MealPlannerValidation.createPlanAndFillValidation),
  mealPlannerController.generatePlan
);

mealPlannerRouter.post(
  '/plans/variante',
  validateRequest(MealPlannerValidation.varianteValidation),
  mealPlannerController.variante
);

mealPlannerRouter.post(
  '/plans/clear-slot',
  validateRequest(MealPlannerValidation.clearSlotMealValidation),
  mealPlannerController.clearSlotMeal
);

mealPlannerRouter.post(
  '/plans/cheat-day',
  validateRequest(MealPlannerValidation.addCheatMealValidation),
  mealPlannerController.addCheatMeal
);

mealPlannerRouter.post(
  '/plans/remove-cheat',
  validateRequest(MealPlannerValidation.removeCheatMealValidation),
  mealPlannerController.removeCheatMeal
);

mealPlannerRouter.get('/plans/today/:userId', mealPlannerController.getTodayPlan);
mealPlannerRouter.get('/plans/user/:userId', mealPlannerController.getMealPlansByUser);
mealPlannerRouter.get('/plans/:id', mealPlannerController.getMealPlanById);
mealPlannerRouter.delete('/plans/:id', mealPlannerController.deleteMealPlan);

export default mealPlannerRouter;
