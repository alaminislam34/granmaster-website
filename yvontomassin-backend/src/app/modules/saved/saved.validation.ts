import { z } from 'zod';

const mealSnapshot = z.object({
  name: z.string(),
  calories: z.number().min(0),
  protein: z.number().min(0).default(0),
  carbohydrates: z.number().min(0).default(0),
  fat: z.number().min(0).default(0),
  description: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
});

const slotSnapshot = z.object({
  slot: z.string(),
  category: z.string(),
  meal: mealSnapshot.nullable(),
});

const cheatSnapshot = z.object({
  name: z.string(),
  calories: z.number().min(0),
  description: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
});

const snapshotSchema = z.object({
  calorieGoal: z.number().min(0),
  dailyTotalCalories: z.number().min(0),
  dailyTotalProtein: z.number().min(0).default(0),
  dailyTotalCarbohydrates: z.number().min(0).default(0),
  dailyTotalFat: z.number().min(0).default(0),
  proteinGoal: z.number().min(0).optional(),
  carbohydratesGoal: z.number().min(0).optional(),
  fatGoal: z.number().min(0).optional(),
  maxAllowedCalories: z.number().min(0).optional(),
  slots: z.array(slotSnapshot).default([]),
  cheatMeals: z.array(cheatSnapshot).default([]),
  instructions: z.array(z.string()).optional(),
});

const createSavedValidation = z.object({
  body: z.object({
    userId: z.string({ message: 'userId is required' }),
    type: z.enum(['day', 'strategy']),
    title: z.string().min(2).trim(),
    snapshot: snapshotSchema,
  }),
});

export const SavedValidation = {
  createSavedValidation,
};
