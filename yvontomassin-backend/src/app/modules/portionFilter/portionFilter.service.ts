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

const toPlainTable = (table: PortionTable): PortionTable => {
  const plain = {} as PortionTable;
  for (const category of PORTION_CATEGORIES) {
    plain[category] = {} as PortionTable[PortionCategory];
    for (const size of PORTION_SIZES) {
      const band = table?.[category]?.[size] as { min?: unknown; max?: unknown } | undefined;
      const fallback = DEFAULT_PORTION_TABLE[category][size];
      const min = Number(band?.min);
      const max = Number(band?.max);
      plain[category][size] = {
        min: Number.isFinite(min) ? min : fallback.min,
        max: Number.isFinite(max) ? max : fallback.max,
      };
    }
  }
  return plain;
};

const getOrCreateTable = async (): Promise<PortionTable> => {
  const existing = await PortionFilterModel.findOne({ key: 'default' }).lean();
  if (!existing?.table) {
    const created = await PortionFilterModel.create({
      key: 'default',
      table: DEFAULT_PORTION_TABLE,
    });
    return toPlainTable(created.toObject().table);
  }

  const plain = toPlainTable(existing.table as PortionTable);
  const stored = existing.table as PortionTable;
  const broken = PORTION_CATEGORIES.some((category) =>
    PORTION_SIZES.some((size) => {
      const min = Number(stored?.[category]?.[size]?.min);
      const max = Number(stored?.[category]?.[size]?.max);
      return !Number.isFinite(min) || !Number.isFinite(max);
    })
  );
  if (broken) {
    await PortionFilterModel.updateOne({ key: 'default' }, { $set: { table: plain } });
  }
  return plain;
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
      const min = Number(table[category][size].min);
      const max = Number(table[category][size].max);
      const mealCount = await MealModel.countDocuments({
        category,
        calories: { $gte: min, $lte: max },
      });
      categories[category][size] = { min, max, mealCount };
    }
  }

  return categories;
};

const getPortionFilters = async () => {
  const table = await getOrCreateTable();
  return withMealCounts(table);
};

const updatePortionFilters = async (table: PortionTable) => {
  const plain = toPlainTable(table);

  for (const category of PORTION_CATEGORIES) {
    for (const size of PORTION_SIZES) {
      const band = plain[category][size];
      if (!Number.isFinite(band.min) || !Number.isFinite(band.max) || band.min > band.max) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `Range non valido per ${category} ${size}`
        );
      }
    }
  }

  const doc = await PortionFilterModel.findOneAndUpdate(
    { key: 'default' },
    { $set: { table: plain } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return withMealCounts(toPlainTable((doc?.table as PortionTable) ?? plain));
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
