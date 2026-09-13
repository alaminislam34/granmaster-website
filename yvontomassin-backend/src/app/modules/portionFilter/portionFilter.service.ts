import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import { MealModel } from '../mealplanner/meal.model';
import {
  DEFAULT_PORTION_TABLE,
  PORTION_CATEGORIES,
  PORTION_SIZES,
  PortionCategory,
  PortionSize,
  PortionTable,
} from './portionFilter.constant';
import { PortionFilterModel } from './portionFilter.model';

const getOrCreateTable = async (): Promise<PortionTable> => {
  const existing = await PortionFilterModel.findOne({ key: 'default' });
  if (existing) return existing.table;

  const created = await PortionFilterModel.create({
    key: 'default',
    table: DEFAULT_PORTION_TABLE,
  });
  return created.table;
};

const withMealCounts = async (table: PortionTable) => {
  const categories = {} as Record<
    PortionCategory,
    Record<PortionSize, { min: number; max: number; mealCount: number }>
  >;

  for (const category of PORTION_CATEGORIES) {
    categories[category] = {} as Record<
      PortionSize,
      { min: number; max: number; mealCount: number }
    >;
    for (const size of PORTION_SIZES) {
      const band = table[category][size];
      const mealCount = await MealModel.countDocuments({
        category,
        calories: { $gte: band.min, $lte: band.max },
      });
      categories[category][size] = { ...band, mealCount };
    }
  }

  return categories;
};

const getPortionFilters = async () => {
  const table = await getOrCreateTable();
  return withMealCounts(table);
};

const updatePortionFilters = async (table: PortionTable) => {
  for (const category of PORTION_CATEGORIES) {
    for (const size of PORTION_SIZES) {
      const band = table?.[category]?.[size];
      if (!band || band.min < 0 || band.max < 0 || band.min > band.max) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `Range non valido per ${category} ${size}`
        );
      }
    }
  }

  const doc = await PortionFilterModel.findOneAndUpdate(
    { key: 'default' },
    { table },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return withMealCounts(doc.table);
};

const resolvePortionRange = async (
  category: string,
  size: PortionSize
) => {
  const table = await getOrCreateTable();
  const key = (PORTION_CATEGORIES.includes(category as PortionCategory)
    ? category
    : 'Snack') as PortionCategory;
  return table[key][size];
};

export const portionFilterService = {
  getPortionFilters,
  updatePortionFilters,
  resolvePortionRange,
  getOrCreateTable,
};
