import { z } from 'zod';
import {
  PORTION_CATEGORIES,
  PORTION_SIZES,
  PortionCategory,
  PortionTable,
} from './portionFilter.constant';

const CATEGORY_IT: Record<PortionCategory, string> = {
  Breakfast: 'Colazione',
  Snack: 'Merenda',
  Lunch: 'Pranzo',
  Dinner: 'Cena',
};

const band = z.object({
  min: z.number().int().min(0),
  max: z.number().int().min(0),
});

const categoryTable = z.object({
  Small: band,
  Medium: band,
  Large: band,
});

export const sequentialPortionErrors = (table: PortionTable): string[] => {
  const errors: string[] = [];

  for (const category of PORTION_CATEGORIES) {
    const { Small, Medium, Large } = table[category];
    const label = CATEGORY_IT[category];

    if (Small.min > Small.max) {
      errors.push(
        `${label}: Piccola deve avere il minimo minore o uguale al massimo.`
      );
    }
    if (Medium.min !== Small.max + 1) {
      errors.push(
        `${label}: Media deve iniziare da ${Small.max + 1} kcal (Piccola max + 1).`
      );
    }
    if (Medium.min > Medium.max) {
      errors.push(
        `${label}: Media deve avere il minimo minore o uguale al massimo.`
      );
    }
    if (Large.min !== Medium.max + 1) {
      errors.push(
        `${label}: Grande deve iniziare da ${Medium.max + 1} kcal (Media max + 1).`
      );
    }
    if (Large.min > Large.max) {
      errors.push(
        `${label}: Grande deve avere il minimo minore o uguale al massimo.`
      );
    }
  }

  return errors;
};

const updatePortionFilterValidation = z.object({
  body: z.object({
    table: z
      .object({
        Breakfast: categoryTable,
        Snack: categoryTable,
        Lunch: categoryTable,
        Dinner: categoryTable,
      })
      .superRefine((table, ctx) => {
        for (const message of sequentialPortionErrors(table as PortionTable)) {
          ctx.addIssue({ code: 'custom', message });
        }
      }),
  }),
});

export const PortionFilterValidation = {
  updatePortionFilterValidation,
  PORTION_CATEGORIES,
  PORTION_SIZES,
};
