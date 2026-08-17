import { z } from 'zod';

const nutritionInfoSchema = z.object({
  calories: z.number({ message: 'Calories is required' }).min(0),
  protein: z.number({ message: 'Protein is required' }).min(0),
  carbohydrates: z.number({ message: 'Carbohydrates is required' }).min(0),
  fat: z.number({ message: 'Fat is required' }).min(0),
});

const createNutritionValidation = z.object({
  body: z.object({
    name: z
      .string({ message: 'Meal name is required' })
      .min(2, 'Name must be at least 2 characters')
      .trim(),
    category: z.enum(
      ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Drink'],
      { message: 'Category is required' }
    ),
    portionSize: z
      .number({ message: 'Portion size is required' })
      .min(1, 'Portion size must be at least 1 gram'),
    description: z.string().trim().optional(),
    nutrition: nutritionInfoSchema,
  }),
});

const partialNutritionInfoSchema = z.object({
  calories: z.number().min(0).optional(),
  protein: z.number().min(0).optional(),
  carbohydrates: z.number().min(0).optional(),
  fat: z.number().min(0).optional(),
});

const updateNutritionValidation = z.object({
  body: z.object({
    name: z.string().min(2).trim().optional(),
    category: z
      .enum(['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Drink'])
      .optional(),
    portionSize: z.number().min(1).optional(),
    description: z.string().trim().optional(),
    nutrition: partialNutritionInfoSchema.optional(),
  }),
});

export const NutritionValidation = {
  createNutritionValidation,
  updateNutritionValidation,
};
