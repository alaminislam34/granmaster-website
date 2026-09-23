import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import { IMeal } from './mealplanner.interface';
import { MealModel } from './meal.model';
import { MealPlanModel } from './mealplan.model';
import { CheatModel } from '../cheat/cheat.model';
import { portionFilterService } from '../portionFilter/portionFilter.service';
import {
  PORTION_CATEGORIES,
  PORTION_SIZES,
  PortionCategory,
  PortionSize,
} from '../portionFilter/portionFilter.constant';
import { s3Service } from '../../services/s3.service';
import {
  CALORIE_RANGE_MAP,
  CALORIE_TOLERANCE_MULTIPLIER,
  CalorieRange,
  getCalorieRange,
  MEAL_STRUCTURES,
} from './mealplanner.constant';

// ═══════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════

/** Fields to populate when returning a full meal plan */
const MEAL_POPULATE_FIELDS =
  'name category calories protein carbohydrates fat calorieRange image description isQuickMeal';

/**
 * Re-compute all daily totals and over-budget status, then persist.
 * Returns the updated + populated plan document.
 */
const recalcPlan = async (planId: Types.ObjectId | string) => {
  // Populate slots.meal directly to get calorie numbers in a single read
  const withMeals = await MealPlanModel.findById(planId).populate<{
    slots: {
      slot: string;
      category: string;
      targetCalories: number;
      meal: {
        calories: number;
        protein: number;
        carbohydrates: number;
        fat: number;
      } | null;
    }[];
  }>('slots.meal', 'calories protein carbohydrates fat');

  if (!withMeals) throw new AppError(StatusCodes.NOT_FOUND, 'Plan not found');

  let totalCal = 0;
  let totalPro = 0;
  let totalCarb = 0;
  let totalFat = 0;

  // Sum regular meal slots
  for (const s of withMeals.slots) {
    if (s.meal) {
      totalCal += s.meal.calories;
      totalPro += s.meal.protein;
      totalCarb += s.meal.carbohydrates;
      totalFat += s.meal.fat;
    }
  }

  // Sum cheat meals — calories is a plain stored number (snapshot), not a ref
  for (const c of withMeals.cheatMeals || []) {
    totalCal += Number(c.calories) || 0;
  }

  const maxAllowed = withMeals.calorieGoal * CALORIE_TOLERANCE_MULTIPLIER;
  const isOverBudget = totalCal > maxAllowed;

  return await MealPlanModel.findByIdAndUpdate(
    planId,
    {
      dailyTotalCalories: totalCal,
      dailyTotalProtein: totalPro,
      dailyTotalCarbohydrates: totalCarb,
      dailyTotalFat: totalFat,
      maxAllowedCalories: maxAllowed,
      isOverBudget,
      status: isOverBudget ? 'red' : 'green',
    },
    { new: true }
  )
    .populate('slots.meal', MEAL_POPULATE_FIELDS)
    .populate('cheatMeals.cheatMealRef', 'name nutrition image description');
};

type MacroRange = { min: number; max: number };

const constraintFromRange = (range?: MacroRange) => {
  if (!range) return undefined;
  const q: Record<string, number> = {};
  if (range.min > 0) q.$gte = range.min;
  if (range.max > 0 && range.max < 9999) q.$lte = range.max;
  return Object.keys(q).length ? q : undefined;
};

/**
 * Pick a random meal within an exact calorie range [minCal, maxCal].
 * Strictly within [minCal, maxCal] + same category (never expands across portion boundaries).
 * Excludes already-picked meals if alternatives are available.
 * NO fallback outside [minCal, maxCal] — returns null if no match found.
 */
const pickRandomMealForCalories = async (
  category: string,
  minCal: number,
  maxCal: number,
  excludeIds?: (string | Types.ObjectId)[],
  extra: Record<string, unknown> = {}
) => {
  const excludeObjectIds = (excludeIds || [])
    .filter(Boolean)
    .map((id) => (typeof id === 'string' ? new Types.ObjectId(id) : id));

  const baseQuery: Record<string, unknown> = {
    category,
    calories: { $gte: minCal, $lte: maxCal },
    ...extra,
  };

  const projection = '_id name calories protein carbohydrates fat isQuickMeal';

  // 1. Exact range excluding already picked meals in other slots
  if (excludeObjectIds.length > 0) {
    const mealsWithoutExcluded = await MealModel.find({
      ...baseQuery,
      _id: { $nin: excludeObjectIds },
    })
      .select(projection)
      .lean();
    if (mealsWithoutExcluded.length) {
      return mealsWithoutExcluded[Math.floor(Math.random() * mealsWithoutExcluded.length)];
    }
  }

  // 2. Exact range fallback (if all available meals in DB were in exclude list)
  const meals = await MealModel.find(baseQuery).select(projection).lean();
  if (meals.length) {
    return meals[Math.floor(Math.random() * meals.length)];
  }

  return null; // Strictly no fallback across portion boundaries!
};

// ═══════════════════════════════════════════════════════════════════
//  MEAL CRUD  (admin)
// ═══════════════════════════════════════════════════════════════════

const createMeal = async (data: IMeal, imageFile?: Express.Multer.File) => {
  const payload: Partial<IMeal> = { ...data };
  delete payload.image;

  if (!payload.calorieRange && payload.calories !== undefined) {
    payload.calorieRange = getCalorieRange(payload.calories);
  }

  let uploadedImageUrl: string | null = null;

  if (imageFile) {
    const uploaded = await s3Service.uploadImage(imageFile, 'meals');
    uploadedImageUrl = uploaded.url;
    payload.image = uploaded.url;
  }

  try {
    return await MealModel.create(payload as IMeal);
  } catch (error) {
    await s3Service.deleteImageBestEffort(uploadedImageUrl);
    throw error;
  }
};

const getAllMeals = async (query: Record<string, unknown> = {}) => {
  const filter: Record<string, unknown> = {};
  if (query.category) filter.category = query.category;
  if (query.calorieRange) filter.calorieRange = query.calorieRange;
  if (query.portionType) filter.portionType = query.portionType;
  if (query.isQuickMeal === 'true' || query.isQuickMeal === true) {
    filter.isQuickMeal = true;
  }
  return await MealModel.find(filter).sort({ createdAt: -1 });
};

const getSingleMeal = async (id: string) => {
  return await MealModel.findById(id);
};

const updateMeal = async (
  id: string,
  payload: Partial<IMeal>,
  imageFile?: Express.Multer.File
) => {
  const existing = await MealModel.findById(id);
  if (!existing) return null;

  const safePayload: Partial<IMeal> = { ...payload };
  delete safePayload.image;

  if (safePayload.calories !== undefined && !safePayload.calorieRange) {
    safePayload.calorieRange = getCalorieRange(safePayload.calories);
  }

  let uploadedImageUrl: string | null = null;

  if (imageFile) {
    const uploaded = await s3Service.uploadImage(imageFile, 'meals');
    uploadedImageUrl = uploaded.url;
    safePayload.image = uploaded.url;
  }

  let result;
  try {
    result = await MealModel.findByIdAndUpdate(id, safePayload, {
      new: true,
      runValidators: true,
    });
  } catch (error) {
    await s3Service.deleteImageBestEffort(uploadedImageUrl);
    throw error;
  }

  if (uploadedImageUrl && existing.image && existing.image !== uploadedImageUrl) {
    await s3Service.deleteImageBestEffort(existing.image);
  }

  return result;
};

const deleteMeal = async (id: string) => {
  const result = await MealModel.findByIdAndDelete(id);
  if (result) {
    await s3Service.deleteImageBestEffort(result.image);
  }
  return result;
};

const getMealsByCalorieRange = async (calorieRange: CalorieRange) => {
  return await MealModel.find({ calorieRange }).sort({ calories: 1 });
};

// ═══════════════════════════════════════════════════════════════════
//  "VEDI PIANO PASTO" — create plan + auto-fill in one request
// ═══════════════════════════════════════════════════════════════════

/**
 * This is the main entry point called when the user clicks
 * "VEDI PIANO PASTO" on screen 1.
 *
 * 1. Build slot structure from mealCount.
 * 2. For each slot, pick a random meal from the DB that matches
 *    the per-slot calorie target the user selected.
 * 3. Persist the plan.
 * 4. Recalculate and return the fully-populated plan.
 */
const createPlanAndFill = async (payload: {
  userId: string;
  mealCount: 3 | 4 | 5 | 6;
  calorieGoal?: number;
  proteinGoal: number;
  carbohydratesGoal: number;
  fatGoal: number;
  slotCalorieRanges?: { min: number; max: number }[];
  slotPortions?: PortionSize[];
  date?: string;
  quickMealsOnly?: boolean;
  slotProteinRanges?: MacroRange[];
  slotCarbRanges?: MacroRange[];
  slotFatRanges?: MacroRange[];
}) => {
  const {
    userId,
    mealCount,
    proteinGoal,
    carbohydratesGoal,
    fatGoal,
    date,
    quickMealsOnly,
    slotProteinRanges,
    slotCarbRanges,
    slotFatRanges,
  } = payload;

  const structure = MEAL_STRUCTURES[mealCount];

  let slotCalorieRanges = payload.slotCalorieRanges;
  if (payload.slotPortions?.length === structure.length) {
    slotCalorieRanges = [];
    for (let i = 0; i < structure.length; i++) {
      slotCalorieRanges.push(
        await portionFilterService.resolvePortionRange(
          structure[i].category,
          payload.slotPortions[i]
        )
      );
    }
  }

  if (!slotCalorieRanges || slotCalorieRanges.length !== structure.length) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `slotCalorieRanges must have exactly ${structure.length} entries for a ${mealCount}-meal plan`
    );
  }

  const calorieGoal =
    payload.calorieGoal && payload.calorieGoal > 0
      ? payload.calorieGoal
      : slotCalorieRanges.reduce(
          (sum, range) => sum + Math.round((range.min + range.max) / 2),
          0
        );

  const planDate = date ? new Date(date) : new Date();
  planDate.setUTCHours(0, 0, 0, 0);

  // Build slots and fill meals using exact calorie ranges
  const slots = [];
  const pickedMealIds: Types.ObjectId[] = [];
  for (let i = 0; i < structure.length; i++) {
    const { slot, category } = structure[i];
    const { min, max } = slotCalorieRanges[i];
    const targetCalories = Math.round((min + max) / 2);

    const extra: Record<string, unknown> = {};
    if (quickMealsOnly) extra.isQuickMeal = true;
    const proteinQ = constraintFromRange(slotProteinRanges?.[i]);
    const carbQ = constraintFromRange(slotCarbRanges?.[i]);
    const fatQ = constraintFromRange(slotFatRanges?.[i]);
    if (proteinQ) extra.protein = proteinQ;
    if (carbQ) extra.carbohydrates = carbQ;
    if (fatQ) extra.fat = fatQ;

    const meal = await pickRandomMealForCalories(category, min, max, pickedMealIds, extra);

    if (!meal) {
      const portionIt =
        payload.slotPortions?.[i] === 'Small'
          ? 'Piccola'
          : payload.slotPortions?.[i] === 'Large'
            ? 'Grande'
            : payload.slotPortions?.[i] === 'Medium'
              ? 'Media'
              : null;
      const rangeLabel = portionIt
        ? ` (${portionIt}, ${min}–${max} kcal)`
        : ` nel range ${min}–${max} kcal`;
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        quickMealsOnly
          ? `Nessun pasto veloce trovato per "${slot}"${rangeLabel}.`
          : `Nessun pasto trovato per "${slot}"${rangeLabel}. Aggiungi pasti in questo range dal pannello admin o modifica i filtri porzione.`
      );
    }

    pickedMealIds.push(meal._id as Types.ObjectId);

    slots.push({
      slot,
      category,
      targetCalories,
      targetCaloriesMin: min,
      targetCaloriesMax: max,
      meal: meal._id,
    });
  }

  const maxAllowed = calorieGoal * CALORIE_TOLERANCE_MULTIPLIER;

  // Upsert: if a plan already exists for this user+date, replace it
  const plan = await MealPlanModel.findOneAndUpdate(
    { user: new Types.ObjectId(userId), date: planDate },
    {
      user: new Types.ObjectId(userId),
      date: planDate,
      mealCount,
      calorieGoal,
      proteinGoal,
      carbohydratesGoal,
      fatGoal,
      slots,
      cheatMeals: [],
      dailyTotalCalories: 0,
      dailyTotalProtein: 0,
      dailyTotalCarbohydrates: 0,
      dailyTotalFat: 0,
      maxAllowedCalories: maxAllowed,
      isOverBudget: false,
      status: 'green',
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return await recalcPlan(plan._id as Types.ObjectId);
};

// ═══════════════════════════════════════════════════════════════════
//  PLAN READ / DELETE
// ═══════════════════════════════════════════════════════════════════

const getMealPlanById = async (planId: string) => {
  return await MealPlanModel.findById(planId)
    .populate('slots.meal', MEAL_POPULATE_FIELDS)
    .populate('cheatMeals.cheatMealRef', 'name nutrition image description');
};

const getMealPlansByUser = async (userId: string) => {
  return await MealPlanModel.find({ user: new Types.ObjectId(userId) })
    .sort({ date: -1 })
    .populate('slots.meal', MEAL_POPULATE_FIELDS)
    .populate('cheatMeals.cheatMealRef', 'name nutrition image description');
};

const getTodayPlanForUser = async (userId: string) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return await MealPlanModel.findOne({
    user: new Types.ObjectId(userId),
    date: today,
  })
    .populate('slots.meal', MEAL_POPULATE_FIELDS)
    .populate('cheatMeals.cheatMealRef', 'name nutrition image description');
};

const deleteMealPlan = async (planId: string) => {
  return await MealPlanModel.findByIdAndDelete(planId);
};

// ═══════════════════════════════════════════════════════════════════
//  VARIANTE (meal swap button)
// ═══════════════════════════════════════════════════════════════════

/**
 * VARIANTE (meal swap button):
 * 1. Strictly stays within the slot's portion filter calorie range [minCal, maxCal].
 *    Never expands across portion filters!
 * 2. Excludes meals already selected in other slots of today's plan.
 * 3. Cycles linearly and progressively forward through available meals:
 *    Meal 1 -> Meal 2 -> Meal 3 -> ... without random bouncing or repetition.
 */
const variante = async (payload: {
  planId: string;
  slotIndex: number;
  currentMealId: string;
  fewerCaloriesOnly?: boolean;
}) => {
  const { planId, slotIndex, currentMealId } = payload;

  const plan = await MealPlanModel.findById(planId);
  if (!plan) throw new AppError(StatusCodes.NOT_FOUND, 'Meal plan not found');

  const slot = plan.slots[slotIndex];
  if (!slot) throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid slot index');

  // 1. Determine strict portion calorie bounds [minCal, maxCal]
  let minCal = slot.targetCaloriesMin;
  let maxCal = slot.targetCaloriesMax;

  if (!minCal || !maxCal || minCal <= 0 || maxCal <= 0) {
    let currentCalories = 300;
    if (currentMealId) {
      const currentMeal = await MealModel.findById(currentMealId)
        .select('calories calorieRange')
        .lean();
      if (currentMeal?.calories) currentCalories = currentMeal.calories;
    }

    const table = await portionFilterService.getOrCreateTable();
    const catKey = (PORTION_CATEGORIES.includes(slot.category as PortionCategory)
      ? slot.category
      : 'Snack') as PortionCategory;
    const catBands = table[catKey];

    if (catBands) {
      for (const size of PORTION_SIZES) {
        if (
          currentCalories >= catBands[size].min &&
          currentCalories <= catBands[size].max
        ) {
          minCal = catBands[size].min;
          maxCal = catBands[size].max;
          break;
        }
      }
    }

    if (!minCal || !maxCal || minCal <= 0 || maxCal <= 0) {
      const cr = getCalorieRange(currentCalories);
      minCal = CALORIE_RANGE_MAP[cr].min;
      maxCal = CALORIE_RANGE_MAP[cr].max;
    }
  }

  // 2. Collect meals used in other slots of this plan to prevent repetitions
  const otherSlotMealIds = new Set<string>();
  plan.slots.forEach((s, idx) => {
    if (idx !== slotIndex && s.meal) {
      otherSlotMealIds.add(s.meal.toString());
    }
  });

  // 3. Find candidate meals with minimal memory footprint (.lean()) and field projection
  const candidates = await MealModel.find({
    category: slot.category,
    calories: { $gte: minCal, $lte: maxCal },
  })
    .select('_id name calories protein carbohydrates fat image description isQuickMeal')
    .sort({ calories: 1, name: 1, _id: 1 })
    .lean();

  if (!candidates.length) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      `Nessun pasto trovato per "${slot.slot}" nella porzione ${minCal}–${maxCal} kcal.`
    );
  }

  // 4. Linear and progressive scrolling
  const currentIndex = candidates.findIndex(
    (m) => m._id.toString() === currentMealId
  );

  let nextMeal: (typeof candidates)[number] | null = null;

  // Primary pass: search forward from (currentIndex + 1) for a meal not current and not used in other slots
  for (let offset = 1; offset <= candidates.length; offset++) {
    const candidate = candidates[(currentIndex + offset) % candidates.length];
    const candidateIdStr = candidate._id.toString();
    if (candidateIdStr !== currentMealId && !otherSlotMealIds.has(candidateIdStr)) {
      nextMeal = candidate;
      break;
    }
  }

  // Secondary pass: if all candidates are used in other slots of today's plan,
  // pick the next progressive candidate in the list that is simply not the current meal
  if (!nextMeal) {
    for (let offset = 1; offset <= candidates.length; offset++) {
      const candidate = candidates[(currentIndex + offset) % candidates.length];
      if (candidate._id.toString() !== currentMealId) {
        nextMeal = candidate;
        break;
      }
    }
  }

  if (!nextMeal) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      `Nessun altro pasto disponibile per "${slot.slot}" in questa porzione (${minCal}–${maxCal} kcal). Aggiungi più pasti dal pannello admin.`
    );
  }

  plan.slots[slotIndex].meal = nextMeal._id as Types.ObjectId;
  await plan.save();

  const updated = await recalcPlan(plan._id as Types.ObjectId);
  return { plan: updated, newMeal: nextMeal };
};

// ═══════════════════════════════════════════════════════════════════
//  CHEAT DAY
// ═══════════════════════════════════════════════════════════════════

const addCheatMeal = async (payload: {
  planId: string;
  cheatMealId: string;
}) => {
  const { planId, cheatMealId } = payload;

  const plan = await MealPlanModel.findById(planId);
  if (!plan) throw new AppError(StatusCodes.NOT_FOUND, 'Meal plan not found');

  const cheat = await CheatModel.findById(cheatMealId);
  if (!cheat) throw new AppError(StatusCodes.NOT_FOUND, 'Cheat meal not found');

  if (!plan.cheatMeals) {
    plan.cheatMeals = [];
  }

  // Bug fix: prevent adding the same cheat meal twice
  const alreadyAdded = plan.cheatMeals.some((c: any) => {
    const refId = c?.cheatMealRef?._id
      ? c.cheatMealRef._id.toString()
      : c?.cheatMealRef?.toString();
    return refId === cheatMealId;
  });
  if (alreadyAdded) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `"${cheat.name}" è già stato aggiunto al piano. Rimuovilo prima di aggiungerlo di nuovo.`
    );
  }

  plan.cheatMeals.push({
    cheatMealRef: cheat._id as Types.ObjectId,
    name: cheat.name,
    calories: cheat.nutrition?.calories ?? 0,   // snapshot — not a live ref
  });

  await plan.save();
  return await recalcPlan(plan._id as Types.ObjectId);
};

const removeCheatMeal = async (payload: {
  planId: string;
  cheatMealIndex: number;
}) => {
  const { planId, cheatMealIndex } = payload;

  const plan = await MealPlanModel.findById(planId);
  if (!plan) throw new AppError(StatusCodes.NOT_FOUND, 'Meal plan not found');

  if (!plan.cheatMeals) {
    plan.cheatMeals = [];
  }

  if (cheatMealIndex < 0 || cheatMealIndex >= plan.cheatMeals.length)
    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid cheat meal index');

  plan.cheatMeals.splice(cheatMealIndex, 1);
  await plan.save();
  return await recalcPlan(plan._id as Types.ObjectId);
};

const clearSlotMeal = async (payload: {
  planId: string;
  slotIndex: number;
}) => {
  const { planId, slotIndex } = payload;

  const plan = await MealPlanModel.findById(planId);
  if (!plan) throw new AppError(StatusCodes.NOT_FOUND, 'Meal plan not found');

  if (slotIndex < 0 || slotIndex >= plan.slots.length) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid slot index');
  }

  plan.slots[slotIndex].meal = null;
  await plan.save();
  return await recalcPlan(plan._id as Types.ObjectId);
};

// ═══════════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════════

export const mealPlannerService = {
  // Meals (admin)
  createMeal,
  getAllMeals,
  getSingleMeal,
  updateMeal,
  deleteMeal,
  getMealsByCalorieRange,
  // Plans
  createPlanAndFill,
  getMealPlanById,
  getMealPlansByUser,
  getTodayPlanForUser,
  deleteMealPlan,
  // Actions
  variante,
  clearSlotMeal,
  addCheatMeal,
  removeCheatMeal,
};
