import { Types } from 'mongoose';
import { CalorieRange, MealCategory } from './mealplanner.constant';

// ─── Meal (database item) ─────────────────────────────────────────────────────
export interface IMeal {
  name: string;
  category: MealCategory;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  calorieRange: CalorieRange;
  image?: string;
  description?: string;
  isQuickMeal?: boolean;
}

// ─── One slot inside a daily plan ─────────────────────────────────────────────
export interface IMealPlanSlot {
  slot: string;
  category: MealCategory;
  targetCalories: number;
  targetCaloriesMin: number;
  targetCaloriesMax: number;
  meal: Types.ObjectId | null;
}

// ─── Daily Meal Plan (one per user per day) ───────────────────────────────────
export interface IMealPlan {
  user: Types.ObjectId;
  date: Date;
  mealCount: 3 | 4 | 5 | 6;

  // Daily nutritional goals (from screen 1 form)
  calorieGoal: number;
  proteinGoal: number;
  carbohydratesGoal: number;
  fatGoal: number;

  slots: IMealPlanSlot[];

  // Cheat meals added via CHEAT DAY button
  cheatMeals: {
    cheatMealRef: Types.ObjectId;
    name: string;
    calories: number;
  }[];

  // Recalculated on every mutation
  dailyTotalCalories: number;
  dailyTotalProtein: number;
  dailyTotalCarbohydrates: number;
  dailyTotalFat: number;

  maxAllowedCalories: number; // calorieGoal × 1.2
  isOverBudget: boolean;
  status: 'green' | 'red';
}
