import mongoose, { Schema } from 'mongoose';
import { ICheat } from './cheat.interface';

const CheatSchema = new Schema<ICheat>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    image: { type: String, default: null },
    nutrition: {
      calories: { type: Number, required: true },
      protein: { type: Number, required: true },
      carbohydrates: { type: Number, required: true },
      fat: { type: Number, required: true },
    },
  },
  { timestamps: true }
);

export const CheatModel = mongoose.model<ICheat>('Cheat', CheatSchema);
