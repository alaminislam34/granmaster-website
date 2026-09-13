import { z } from 'zod';
import { PORTION_CATEGORIES, PORTION_SIZES } from './portionFilter.constant';

const band = z.object({
  min: z.number().min(0),
  max: z.number().min(0),
});

const categoryTable = z.object({
  Small: band,
  Medium: band,
  Large: band,
});

const updatePortionFilterValidation = z.object({
  body: z.object({
    table: z.object({
      Breakfast: categoryTable,
      Snack: categoryTable,
      Lunch: categoryTable,
      Dinner: categoryTable,
    }),
  }),
});

export const PortionFilterValidation = {
  updatePortionFilterValidation,
  PORTION_CATEGORIES,
  PORTION_SIZES,
};
