import { Types } from 'mongoose';

export type SavedContentType = 'day' | 'strategy';

export interface ISavedMealSnapshot {
  name: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  description?: string | null;
  image?: string | null;
}

export interface ISavedSlotSnapshot {
  slot: string;
  category: string;
  meal: ISavedMealSnapshot | null;
}

export interface ISavedCheatSnapshot {
  name: string;
  calories: number;
  description?: string | null;
  image?: string | null;
}

export interface ISavedSnapshot {
  calorieGoal: number;
  dailyTotalCalories: number;
  dailyTotalProtein: number;
  dailyTotalCarbohydrates: number;
  dailyTotalFat: number;
  proteinGoal?: number;
  carbohydratesGoal?: number;
  fatGoal?: number;
  maxAllowedCalories?: number;
  slots: ISavedSlotSnapshot[];
  cheatMeals: ISavedCheatSnapshot[];
  instructions?: string[];
}

export interface ISavedContent {
  user: Types.ObjectId;
  type: SavedContentType;
  title: string;
  snapshot: ISavedSnapshot;
}
