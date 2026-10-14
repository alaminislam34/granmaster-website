export type MealCategory =
  | 'Breakfast'
  | 'Lunch'
  | 'Dinner'
  | 'Snack'
  | 'Dessert'
  | 'Drink';

export interface INutritionInfo {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

export type PortionType = 'Small' | 'Medium' | 'Large';

export type DietaryType = 'Meat' | 'Fish' | 'Vegan';

export interface INutrition {
  name: string;
  category: MealCategory;
  portionSize?: number; // legacy, in grams — no longer required
  portionType?: PortionType;
  image?: string;
  description?: string;
  isQuickMeal?: boolean; // "Fast" tag
  dietaryTypes?: DietaryType[];
  nutrition: INutritionInfo;
}

