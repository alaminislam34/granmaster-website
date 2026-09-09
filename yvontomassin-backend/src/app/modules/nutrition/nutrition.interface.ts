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

export interface INutrition {
  name: string;
  category: MealCategory;
  portionSize: number; // in grams
  image?: string;
  description?: string;
  isQuickMeal?: boolean;
  nutrition: INutritionInfo;
}
