import { z } from 'zod';
import { CALORIE_RANGES, MEAL_CATEGORIES } from './mealplanner.constant';

// ─── Meal CRUD ────────────────────────────────────────────────────────────────
const createMealValidation = z.object({
  body: z.object({
    name: z
      .string({ message: 'Meal name is required' })
      .min(2, 'Name must be at least 2 characters')
      .trim(),
    category: z.enum([...MEAL_CATEGORIES] as [string, ...string[]], {
      message: 'Category must be Breakfast, Lunch, Dinner or Snack',
    }),
    calories: z
      .number({ message: 'Calories is required' })
      .min(0, 'Calories must be non-negative'),
    protein: z.number().min(0).default(0),
    carbohydrates: z.number().min(0).default(0),
    fat: z.number().min(0).default(0),
    // calorieRange auto-derived from calories if omitted
    calorieRange: z.enum([...CALORIE_RANGES] as [string, ...string[]]).optional(),
    isQuickMeal: z.boolean().optional(),
  }),
});

const updateMealValidation = z.object({
  body: z.object({
    name: z.string().min(2).trim().optional(),
    category: z.enum([...MEAL_CATEGORIES] as [string, ...string[]]).optional(),
    calories: z.number().min(0).optional(),
    protein: z.number().min(0).optional(),
    carbohydrates: z.number().min(0).optional(),
    fat: z.number().min(0).optional(),
    calorieRange: z.enum([...CALORIE_RANGES] as [string, ...string[]]).optional(),
    isQuickMeal: z.boolean().optional(),
  }),
});

// ─── "VEDI PIANO PASTO" — create plan + auto-fill in one shot ────────────────
//  slotCalories: array of calorie targets, one per slot in order
//  e.g. [200, 200, 300, 400] for a 4-meal plan
const createPlanAndFillValidation = z.object({
  body: z.object({
    userId: z.string({ message: 'userId is required' }),
    mealCount: z
      .number({ message: 'mealCount is required' })
      .refine((v) => [3, 4, 5, 6].includes(v), {
        message: 'mealCount must be 3, 4, 5 or 6',
      }),
    calorieGoal: z
      .number({ message: 'calorieGoal is required' })
      .min(1, 'calorieGoal must be positive'),
    proteinGoal: z.number().min(0).default(0),
    carbohydratesGoal: z.number().min(0).default(0),
    fatGoal: z.number().min(0).default(0),
    slotCalorieRanges: z
      .array(z.object({ min: z.number().min(0), max: z.number().min(0) }))
      .min(3, 'slotCalorieRanges must have at least 3 entries')
      .max(6, 'slotCalorieRanges must have at most 6 entries'),
    date: z.string().optional(), // ISO date; defaults to today
    // Optional extras — omitted by old clients, so live generate stays the same
    quickMealsOnly: z.boolean().optional(),
    slotProteinRanges: z
      .array(z.object({ min: z.number().min(0), max: z.number().min(0) }))
      .optional(),
    slotCarbRanges: z
      .array(z.object({ min: z.number().min(0), max: z.number().min(0) }))
      .optional(),
    slotFatRanges: z
      .array(z.object({ min: z.number().min(0), max: z.number().min(0) }))
      .optional(),
  }),
});

// ─── Variante (meal swap) ─────────────────────────────────────────────────────
const varianteValidation = z.object({
  body: z.object({
    planId: z.string({ message: 'planId is required' }),
    slotIndex: z.number({ message: 'slotIndex is required' }).int().min(0),
    currentMealId: z.string({ message: 'currentMealId is required' }),
    fewerCaloriesOnly: z.boolean().optional(),
  }),
});

const clearSlotMealValidation = z.object({
  body: z.object({
    planId: z.string({ message: 'planId is required' }),
    slotIndex: z.number({ message: 'slotIndex is required' }).int().min(0),
  }),
});

// ─── CHEAT DAY ────────────────────────────────────────────────────────────────
const addCheatMealValidation = z.object({
  body: z.object({
    planId: z.string({ message: 'planId is required' }),
    cheatMealId: z.string({ message: 'cheatMealId is required' }),
  }),
});

const removeCheatMealValidation = z.object({
  body: z.object({
    planId: z.string({ message: 'planId is required' }),
    cheatMealIndex: z
      .number({ message: 'cheatMealIndex is required' })
      .int()
      .min(0),
  }),
});

export const MealPlannerValidation = {
  createMealValidation,
  updateMealValidation,
  createPlanAndFillValidation,
  varianteValidation,
  clearSlotMealValidation,
  addCheatMealValidation,
  removeCheatMealValidation,
};
