// ─── Meal categories ──────────────────────────────────────────────────────────
export const MEAL_CATEGORIES = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snack',
] as const;

export type MealCategory = (typeof MEAL_CATEGORIES)[number];

// ─── Calorie ranges ───────────────────────────────────────────────────────────
export type CalorieRange =
  | '100-200'
  | '200-300'
  | '301-400'
  | '401-500'
  | '501-600'
  | '601-700'
  | '701-800';

export const CALORIE_RANGES: CalorieRange[] = [
  '100-200',
  '200-300',
  '301-400',
  '401-500',
  '501-600',
  '601-700',
  '701-800',
];

export const CALORIE_RANGE_MAP: Record<
  CalorieRange,
  { min: number; max: number }
> = {
  '100-200': { min: 100, max: 200 },
  '200-300': { min: 200, max: 300 },  // Fixed: removed gap at 200
  '301-400': { min: 301, max: 400 },
  '401-500': { min: 401, max: 500 },
  '501-600': { min: 501, max: 600 },
  '601-700': { min: 601, max: 700 },
  '701-800': { min: 701, max: 800 },
};

/**
 * Given a calorie number, return the matching CalorieRange label.
 * e.g. 420 → "401-500", 650 → "601-700"
 */
export const getCalorieRange = (calories: number): CalorieRange => {
  for (const [range, { min, max }] of Object.entries(
    CALORIE_RANGE_MAP
  ) as [CalorieRange, { min: number; max: number }][]) {
    if (calories >= min && calories <= max) return range;
  }
  if (calories < 100) return '100-200';
  return '701-800';
};

// ─── Daily meal slot structures ───────────────────────────────────────────────
export const MEAL_STRUCTURES: Record<
  3 | 4 | 5 | 6,
  { slot: string; category: MealCategory }[]
> = {
  3: [
    { slot: 'Breakfast', category: 'Breakfast' },
    { slot: 'Lunch', category: 'Lunch' },
    { slot: 'Dinner', category: 'Dinner' },
  ],
  4: [
    { slot: 'Breakfast', category: 'Breakfast' },
    { slot: 'Snack', category: 'Snack' },
    { slot: 'Lunch', category: 'Lunch' },
    { slot: 'Dinner', category: 'Dinner' },
  ],
  5: [
    { slot: 'Breakfast', category: 'Breakfast' },
    { slot: 'Snack', category: 'Snack' },
    { slot: 'Lunch', category: 'Lunch' },
    { slot: 'Snack 2', category: 'Snack' },
    { slot: 'Dinner', category: 'Dinner' },
  ],
  6: [
    { slot: 'Breakfast', category: 'Breakfast' },
    { slot: 'Snack', category: 'Snack' },
    { slot: 'Lunch', category: 'Lunch' },
    { slot: 'Snack 2', category: 'Snack' },
    { slot: 'Dinner', category: 'Dinner' },
    { slot: 'Snack 3', category: 'Snack' },
  ],
};

/** 20% over-budget tolerance: maxAllowed = calorieGoal × 1.2 */
export const CALORIE_TOLERANCE_MULTIPLIER = 1.2;
