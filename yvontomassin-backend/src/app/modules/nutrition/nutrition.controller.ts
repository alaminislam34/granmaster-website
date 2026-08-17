import { StatusCodes } from 'http-status-codes';
import { Request, Response } from 'express';
import catchAsync from '../../../utils/catchAsync';
import sendResponse from '../../../utils/sendResponse';
import AppError from '../../../errors/AppError';
import { nutritionService } from './nutrition.service';

// POST /api/nutrition/create
const createNutrition = catchAsync(async (req: Request, res: Response) => {
  // support multipart/form-data with JSON "data" field
  if (typeof req.body?.data === 'string') {
    try {
      req.body = JSON.parse(req.body.data);
    } catch {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid JSON in data field');
    }
  }

  const result = await nutritionService.createNutrition(
    req.body,
    req.file as Express.Multer.File | undefined
  );

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Meal created successfully',
    data: result,
  });
});

// GET /api/nutrition
const getAllNutritions = catchAsync(async (_req: Request, res: Response) => {
  const result = await nutritionService.getAllNutritions();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Meals retrieved successfully',
    data: result,
  });
});

// GET /api/nutrition/:id
const getSingleNutrition = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await nutritionService.getSingleNutrition(id);

  if (!result) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Meal not found');
  }

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Meal retrieved successfully',
    data: result,
  });
});

// PATCH /api/nutrition/:id
const updateNutrition = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  if (typeof req.body?.data === 'string') {
    try {
      req.body = JSON.parse(req.body.data);
    } catch {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid JSON in data field');
    }
  }

  const result = await nutritionService.updateNutrition(
    id,
    req.body,
    req.file as Express.Multer.File | undefined
  );

  if (!result) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Meal not found');
  }

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Meal updated successfully',
    data: result,
  });
});

// DELETE /api/nutrition/:id
const deleteNutrition = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await nutritionService.deleteNutrition(id);

  if (!result) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Meal not found');
  }

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Meal deleted successfully',
    data: result,
  });
});

// POST /api/nutrition/sync-meals  — bulk sync all Nutrition → MealPlanner Meal
const syncAllToMealPlanner = catchAsync(async (_req: Request, res: Response) => {
  const result = await nutritionService.syncAllNutritionToMealPlanner();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `Sync complete: ${result.synced} synced, ${result.skipped} skipped (Dessert/Drink not supported)`,
    data: result,
  });
});

export const nutritionController = {
  createNutrition,
  getAllNutritions,
  getSingleNutrition,
  updateNutrition,
  deleteNutrition,
  syncAllToMealPlanner,
};
