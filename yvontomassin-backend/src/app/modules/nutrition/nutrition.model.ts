import mongoose, { Schema } from 'mongoose';
import { INutrition } from './nutrition.interface';

const NutritionSchema = new Schema<INutrition>(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Drink'],
      required: true,
    },
    portionSize: { type: Number, required: true }, // grams
    image: { type: String, default: null },
    description: { type: String, default: null },
    nutrition: {
      calories: { type: Number, required: true },
      protein: { type: Number, required: true },
      carbohydrates: { type: Number, required: true },
      fat: { type: Number, required: true },
    },
  },
  { timestamps: true }
);

export const NutritionModel = mongoose.model<INutrition>(
  'Nutrition',
  NutritionSchema
);
