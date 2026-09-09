import { Schema, model } from 'mongoose';
import { ISavedContent } from './saved.interface';

const MealSnapshotSchema = new Schema(
  {
    name: { type: String, required: true },
    calories: { type: Number, required: true, default: 0 },
    protein: { type: Number, default: 0 },
    carbohydrates: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    description: { type: String, default: null },
    image: { type: String, default: null },
  },
  { _id: false }
);

const SlotSnapshotSchema = new Schema(
  {
    slot: { type: String, required: true },
    category: { type: String, required: true },
    meal: { type: MealSnapshotSchema, default: null },
  },
  { _id: false }
);

const CheatSnapshotSchema = new Schema(
  {
    name: { type: String, required: true },
    calories: { type: Number, required: true, default: 0 },
    description: { type: String, default: null },
    image: { type: String, default: null },
  },
  { _id: false }
);

const SnapshotSchema = new Schema(
  {
    calorieGoal: { type: Number, required: true },
    dailyTotalCalories: { type: Number, required: true },
    dailyTotalProtein: { type: Number, default: 0 },
    dailyTotalCarbohydrates: { type: Number, default: 0 },
    dailyTotalFat: { type: Number, default: 0 },
    proteinGoal: { type: Number, default: 0 },
    carbohydratesGoal: { type: Number, default: 0 },
    fatGoal: { type: Number, default: 0 },
    maxAllowedCalories: { type: Number, default: 0 },
    slots: { type: [SlotSnapshotSchema], default: [] },
    cheatMeals: { type: [CheatSnapshotSchema], default: [] },
    instructions: { type: [String], default: [] },
  },
  { _id: false }
);

const SavedContentSchema = new Schema<ISavedContent>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['day', 'strategy'], required: true },
    title: { type: String, required: true, trim: true },
    snapshot: { type: SnapshotSchema, required: true },
  },
  { timestamps: true }
);

export const SavedContentModel = model<ISavedContent>(
  'SavedContent',
  SavedContentSchema
);
