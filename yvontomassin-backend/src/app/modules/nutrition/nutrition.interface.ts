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

export interface INutrition {
  name: string;
  category: MealCategory;
  portionSize: number; // in grams
  portionType?: PortionType;
  image?: string;
  description?: string;
  isQuickMeal?: boolean;
  nutrition: INutritionInfo;
}

