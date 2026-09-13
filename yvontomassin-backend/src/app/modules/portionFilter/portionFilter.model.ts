import { Schema, model } from 'mongoose';
import { DEFAULT_PORTION_TABLE, PortionTable } from './portionFilter.constant';

interface IPortionFilterDoc {
  key: string;
  table: PortionTable;
}

const bandSchema = new Schema(
  { min: { type: Number, required: true, min: 0 }, max: { type: Number, required: true, min: 0 } },
  { _id: false }
);

const categorySchema = new Schema(
  {
    Small: { type: bandSchema, required: true },
    Medium: { type: bandSchema, required: true },
    Large: { type: bandSchema, required: true },
  },
  { _id: false }
);

const PortionFilterSchema = new Schema<IPortionFilterDoc>(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    table: {
      type: new Schema(
        {
          Breakfast: { type: categorySchema, required: true },
          Snack: { type: categorySchema, required: true },
          Lunch: { type: categorySchema, required: true },
          Dinner: { type: categorySchema, required: true },
        },
        { _id: false }
      ),
      required: true,
      default: DEFAULT_PORTION_TABLE,
    },
  },
  { timestamps: true }
);

export const PortionFilterModel = model<IPortionFilterDoc>(
  'PortionFilter',
  PortionFilterSchema
);
