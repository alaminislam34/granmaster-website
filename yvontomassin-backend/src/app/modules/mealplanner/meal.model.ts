import mongoose, { Schema, Types } from 'mongoose';
import { IMeal } from './mealplanner.interface';
import { CALORIE_RANGES, MEAL_CATEGORIES } from './mealplanner.constant';

// Extend IMeal locally to allow nutritionRef without touching the shared interface
interface IMealWithRef extends IMeal {
  nutritionRef?: Types.ObjectId | null;
}

const MealSchema = new Schema<IMealWithRef>(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: MEAL_CATEGORIES,
      required: true,
    },
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0, default: 0 },
    carbohydrates: { type: Number, required: true, min: 0, default: 0 },
    fat: { type: Number, required: true, min: 0, default: 0 },
    calorieRange: {
      type: String,
      enum: CALORIE_RANGES,
      required: true,
    },
    image: { type: String, default: null },
    description: { type: String, default: null },
    nutritionRef: { type: Schema.Types.ObjectId, ref: 'Nutrition', default: null },
  },
  { timestamps: true }
);

// Index for fast calorie-range + category lookups (VARIANTE queries)
MealSchema.index({ calorieRange: 1, category: 1 });
MealSchema.index({ category: 1, calories: 1 });
MealSchema.index({ nutritionRef: 1 }, { sparse: true });

export const MealModel = mongoose.model<IMealWithRef>('Meal', MealSchema);
