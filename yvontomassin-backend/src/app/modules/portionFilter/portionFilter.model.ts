import { Schema, model } from 'mongoose';
import { DEFAULT_PORTION_TABLE, PortionTable } from './portionFilter.constant';

interface IPortionFilterDoc {
  key: string;
  table: PortionTable;
}

const PortionFilterSchema = new Schema<IPortionFilterDoc>(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    table: { type: Schema.Types.Mixed, required: true, default: DEFAULT_PORTION_TABLE },
  },
  { timestamps: true }
);

export const PortionFilterModel = model<IPortionFilterDoc>(
  'PortionFilter',
  PortionFilterSchema
);
