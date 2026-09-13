export const PORTION_SIZES = ['Small', 'Medium', 'Large'] as const;
export type PortionSize = (typeof PORTION_SIZES)[number];

export const PORTION_CATEGORIES = [
  'Breakfast',
  'Snack',
  'Lunch',
  'Dinner',
] as const;
export type PortionCategory = (typeof PORTION_CATEGORIES)[number];

export type CalorieBand = { min: number; max: number };
export type CategoryPortionTable = Record<PortionSize, CalorieBand>;
export type PortionTable = Record<PortionCategory, CategoryPortionTable>;

export const DEFAULT_PORTION_TABLE: PortionTable = {
  Breakfast: {
    Small: { min: 100, max: 300 },
    Medium: { min: 301, max: 450 },
    Large: { min: 451, max: 600 },
  },
  Snack: {
    Small: { min: 100, max: 200 },
    Medium: { min: 201, max: 350 },
    Large: { min: 351, max: 500 },
  },
  Lunch: {
    Small: { min: 200, max: 400 },
    Medium: { min: 401, max: 600 },
    Large: { min: 601, max: 900 },
  },
  Dinner: {
    Small: { min: 200, max: 400 },
    Medium: { min: 401, max: 600 },
    Large: { min: 601, max: 900 },
  },
};
