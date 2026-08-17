import mongoose, { Schema } from 'mongoose';
import { IMealPlan } from './mealplanner.interface';
import { MEAL_CATEGORIES } from './mealplanner.constant';

const MealPlanSlotSchema = new Schema(
  {
    slot: { type: String, required: true },
    category: { type: String, enum: MEAL_CATEGORIES, required: true },
    targetCalories: { type: Number, required: true, min: 0 },
    targetCaloriesMin: { type: Number, default: 0 },
    targetCaloriesMax: { type: Number, default: 0 },
    meal: { type: Schema.Types.ObjectId, ref: 'Meal', default: null },
  },
  { _id: false }
);

const CheatMealRefSchema = new Schema(
  {
    cheatMealRef: { type: Schema.Types.ObjectId, ref: 'Cheat', required: true },
    name: { type: String, required: true },
    calories: { type: Number, required: true },
  },
  { _id: false }
);

const MealPlanSchema = new Schema<IMealPlan>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    mealCount: { type: Number, enum: [3, 4, 5, 6], required: true },

    calorieGoal: { type: Number, required: true, min: 1 },
    proteinGoal: { type: Number, required: true, min: 0, default: 0 },
    carbohydratesGoal: { type: Number, required: true, min: 0, default: 0 },
    fatGoal: { type: Number, required: true, min: 0, default: 0 },

    slots: { type: [MealPlanSlotSchema], default: [] },
    cheatMeals: { type: [CheatMealRefSchema], default: [] },

    dailyTotalCalories: { type: Number, default: 0 },
    dailyTotalProtein: { type: Number, default: 0 },
    dailyTotalCarbohydrates: { type: Number, default: 0 },
    dailyTotalFat: { type: Number, default: 0 },

    maxAllowedCalories: { type: Number, required: true },
    isOverBudget: { type: Boolean, default: false },
    status: { type: String, enum: ['green', 'red'], default: 'green' },
  },
  { timestamps: true }
);

// One plan per user per day
MealPlanSchema.index({ user: 1, date: 1 }, { unique: true });

export const MealPlanModel = mongoose.model<IMealPlan>('MealPlan', MealPlanSchema);
