import { Router } from 'express';
import { nutritionController } from './nutrition.controller';
import { NutritionValidation } from './nutrition.validation';
import validateRequest from '../../../middlewares/validateRequest';
import { imageUpload } from '../../../middlewares/imageUpload';
import parseBodyData from '../../../middlewares/parseBodyData';

const nutritionRouter = Router();

// POST /api/nutrition/create
nutritionRouter.post(
  '/create',
  imageUpload.single('image'),
  parseBodyData,
  validateRequest(NutritionValidation.createNutritionValidation),
  nutritionController.createNutrition
);

// GET /api/nutrition
nutritionRouter.get('/', nutritionController.getAllNutritions);

// GET /api/nutrition/:id
nutritionRouter.get('/:id', nutritionController.getSingleNutrition);

// PATCH /api/nutrition/:id
nutritionRouter.patch(
  '/:id',
  imageUpload.single('image'),
  parseBodyData,
  validateRequest(NutritionValidation.updateNutritionValidation),
  nutritionController.updateNutrition
);

// DELETE /api/nutrition/:id
nutritionRouter.delete('/:id', nutritionController.deleteNutrition);

// POST /api/nutrition/sync-meals
nutritionRouter.post('/sync-meals', nutritionController.syncAllToMealPlanner);

export default nutritionRouter;
