import { z } from 'zod';

// Helper function to calculate expected calories from macros
const calculateExpectedCalories = (protein: number, carbs: number, fat: number): number => {
  return Math.round((protein * 4) + (carbs * 4) + (fat * 9));
};

const nutritionSchema = z.object({
  calories: z.number({ message: 'Calories is required' }).min(0),
  protein: z.number({ message: 'Protein is required' }).min(0),
  carbohydrates: z.number({ message: 'Carbohydrates is required' }).min(0),
  fat: z.number({ message: 'Fat is required' }).min(0),
}).refine((data) => {
  const expectedCalories = calculateExpectedCalories(data.protein, data.carbohydrates, data.fat);
  const tolerance = Math.max(5, expectedCalories * 0.05); // 5% tolerance or minimum 5 calories
  const actualCalories = data.calories;
  
  return Math.abs(actualCalories - expectedCalories) <= tolerance;
}, {
  message: 'Calories must match macronutrient calculation: (Protein × 4) + (Carbohydrates × 4) + (Fat × 9)',
  path: ['calories'],
});

// Separate validation for update that allows partial nutrition
const partialNutritionSchema = z.object({
  calories: z.number().min(0).optional(),
  protein: z.number().min(0).optional(),
  carbohydrates: z.number().min(0).optional(),
  fat: z.number().min(0).optional(),
}).refine((data) => {
  // Only validate if all fields are provided
  if (data.calories !== undefined && 
      data.protein !== undefined && 
      data.carbohydrates !== undefined && 
      data.fat !== undefined) {
    const expectedCalories = calculateExpectedCalories(data.protein, data.carbohydrates, data.fat);
    const tolerance = Math.max(5, expectedCalories * 0.05);
    return Math.abs(data.calories - expectedCalories) <= tolerance;
  }
  return true; // Skip validation if not all fields present
}, {
  message: 'Calories must match macronutrient calculation when all nutrition values are provided',
  path: ['calories'],
});

const createCheatValidation = z.object({
  body: z.object({
    name: z
      .string({ message: 'Meal name is required' })
      .min(2, 'Name must be at least 2 characters')
      .trim(),
    description: z
      .string({ message: 'Description is required' })
      .min(5, 'Description must be at least 5 characters')
      .trim(),
    nutrition: nutritionSchema,
  }),
});

const updateCheatValidation = z.object({
  body: z.object({
    name: z.string().min(2).trim().optional(),
    description: z.string().min(5).trim().optional(),
    nutrition: partialNutritionSchema.optional(),
  }),
});

export const CheatValidation = {
  createCheatValidation,
  updateCheatValidation,
};
