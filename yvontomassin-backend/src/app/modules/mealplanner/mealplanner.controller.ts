import { StatusCodes } from 'http-status-codes';
import { Request, Response } from 'express';
import catchAsync from '../../../utils/catchAsync';
import sendResponse from '../../../utils/sendResponse';
import AppError from '../../../errors/AppError';
import { mealPlannerService } from './mealplanner.service';

// ═══════════════════════════════════════════════════════════════════
//  MEAL controllers  (admin CRUD)
// ═══════════════════════════════════════════════════════════════════

/** POST /api/meal-planner/meals/create */
const createMeal = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.body?.data === 'string') {
    try { req.body = JSON.parse(req.body.data); }
    catch { throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid JSON in data field'); }
  }

  const result = await mealPlannerService.createMeal(
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

/** GET /api/meal-planner/meals?category=Breakfast&calorieRange=401-500 */
const getAllMeals = catchAsync(async (req: Request, res: Response) => {
  const result = await mealPlannerService.getAllMeals(req.query as any);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Meals retrieved successfully',
    data: result,
  });
});

/** GET /api/meal-planner/meals/by-range/:range */
const getMealsByCalorieRange = catchAsync(async (req: Request, res: Response) => {
  const result = await mealPlannerService.getMealsByCalorieRange(req.params.range as any);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Meals by calorie range retrieved successfully',
    data: result,
  });
});

/** GET /api/meal-planner/meals/:id */
const getSingleMeal = catchAsync(async (req: Request, res: Response) => {
  const result = await mealPlannerService.getSingleMeal(req.params.id as string);
  if (!result) throw new AppError(StatusCodes.NOT_FOUND, 'Meal not found');

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Meal retrieved successfully',
    data: result,
  });
});

/** PATCH /api/meal-planner/meals/:id */
const updateMeal = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.body?.data === 'string') {
    try { req.body = JSON.parse(req.body.data); }
    catch { throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid JSON in data field'); }
  }

  const result = await mealPlannerService.updateMeal(
    req.params.id as string,
    req.body,
    req.file as Express.Multer.File | undefined
  );
  if (!result) throw new AppError(StatusCodes.NOT_FOUND, 'Meal not found');

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Meal updated successfully',
    data: result,
  });
});

/** DELETE /api/meal-planner/meals/:id */
const deleteMeal = catchAsync(async (req: Request, res: Response) => {
  const result = await mealPlannerService.deleteMeal(req.params.id as string);
  if (!result) throw new AppError(StatusCodes.NOT_FOUND, 'Meal not found');

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Meal deleted successfully',
    data: result,
  });
});

// ═══════════════════════════════════════════════════════════════════
//  PLAN controllers
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/meal-planner/plans/generate
 * "VEDI PIANO PASTO" button — creates + auto-fills plan in one shot.
 *
 * Body:
 * {
 *   userId, mealCount, calorieGoal, proteinGoal, carbohydratesGoal, fatGoal,
 *   slotCalories: [200, 200, 300, 400],   // one per slot in order
 *   date?: "2026-06-10"                   // optional, defaults to today
 * }
 */
const generatePlan = catchAsync(async (req: Request, res: Response) => {
  const result = await mealPlannerService.createPlanAndFill(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Meal plan generated successfully',
    data: result,
  });
});

/** GET /api/meal-planner/plans/today/:userId */
const getTodayPlan = catchAsync(async (req: Request, res: Response) => {
  const result = await mealPlannerService.getTodayPlanForUser(req.params.userId as string);

  if (!result)
    throw new AppError(
      StatusCodes.NOT_FOUND,
      'No meal plan found for today. Use POST /plans/generate to create one.'
    );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Today's meal plan retrieved successfully",
    data: result,
  });
});

/** GET /api/meal-planner/plans/user/:userId */
const getMealPlansByUser = catchAsync(async (req: Request, res: Response) => {
  const result = await mealPlannerService.getMealPlansByUser(req.params.userId as string);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User's meal plans retrieved successfully",
    data: result,
  });
});

/** GET /api/meal-planner/plans/:id */
const getMealPlanById = catchAsync(async (req: Request, res: Response) => {
  const result = await mealPlannerService.getMealPlanById(req.params.id as string);
  if (!result) throw new AppError(StatusCodes.NOT_FOUND, 'Meal plan not found');

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Meal plan retrieved successfully',
    data: result,
  });
});

/** DELETE /api/meal-planner/plans/:id */
const deleteMealPlan = catchAsync(async (req: Request, res: Response) => {
  const result = await mealPlannerService.deleteMealPlan(req.params.id as string);
  if (!result) throw new AppError(StatusCodes.NOT_FOUND, 'Meal plan not found');

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Meal plan deleted successfully',
    data: result,
  });
});

// ═══════════════════════════════════════════════════════════════════
//  ACTION controllers
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/meal-planner/plans/variante
 * Replace one meal with another of the same calorie range (or fewer calories if over budget).
 *
 * Body: { planId, slotIndex, currentMealId }
 */
const variante = catchAsync(async (req: Request, res: Response) => {
  const result = await mealPlannerService.variante(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Meal replaced via VARIANTE successfully',
    data: result,
  });
});

/**
 * POST /api/meal-planner/plans/cheat-day
 * Add a cheat meal to the plan and recalculate totals.
 *
 * Body: { planId, cheatMealId }
 */
const addCheatMeal = catchAsync(async (req: Request, res: Response) => {
  const result = await mealPlannerService.addCheatMeal(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Cheat meal added to plan successfully',
    data: result,
  });
});

/**
 * POST /api/meal-planner/plans/remove-cheat
 * Remove a cheat meal from the plan by index.
 *
 * Body: { planId, cheatMealIndex }
 */
const removeCheatMeal = catchAsync(async (req: Request, res: Response) => {
  const result = await mealPlannerService.removeCheatMeal(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Cheat meal removed from plan successfully',
    data: result,
  });
});

const clearSlotMeal = catchAsync(async (req: Request, res: Response) => {
  const result = await mealPlannerService.clearSlotMeal(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Meal removed from day successfully',
    data: result,
  });
});

export const mealPlannerController = {
  // Meals
  createMeal,
  getAllMeals,
  getSingleMeal,
  updateMeal,
  deleteMeal,
  getMealsByCalorieRange,
  // Plans
  generatePlan,
  getTodayPlan,
  getMealPlansByUser,
  getMealPlanById,
  deleteMealPlan,
  // Actions
  variante,
  clearSlotMeal,
  addCheatMeal,
  removeCheatMeal,
};
