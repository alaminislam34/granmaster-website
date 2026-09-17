import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import { IMeal } from './mealplanner.interface';
import { MealModel } from './meal.model';
import { MealPlanModel } from './mealplan.model';
import { CheatModel } from '../cheat/cheat.model';
import { portionFilterService } from '../portionFilter/portionFilter.service';
import { PortionSize } from '../portionFilter/portionFilter.constant';
import { s3Service } from '../../services/s3.service';
import {
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
  // Fetch the raw plan (no population needed — calories are stored directly)
  const plan = await MealPlanModel.findById(planId);
  if (!plan) throw new AppError(StatusCodes.NOT_FOUND, 'Plan not found');

  // Populate only slots.meal to get calorie numbers
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
  for (const c of plan.cheatMeals || []) {
    totalCal += Number(c.calories) || 0;
  }

  const maxAllowed = plan.calorieGoal * CALORIE_TOLERANCE_MULTIPLIER;
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
 * 1. Exact range + same category
 * 2. Slightly expanded ±10% + same category
 * NO further fallback — returns null if no match found.
 */
const pickRandomMealForCalories = async (
  category: string,
  minCal: number,
  maxCal: number,
  excludeId?: string,
  extra: Record<string, unknown> = {}
) => {
  const excludeFilter = excludeId ? { $ne: new Types.ObjectId(excludeId) } : undefined;

  const build = (calorieFilter: Record<string, unknown>) => {
    const f: Record<string, unknown> = { category, ...extra, ...calorieFilter };
    if (excludeFilter) f._id = excludeFilter;
    return f;
  };

  // 1. Exact range
  let meals = await MealModel.find(build({ calories: { $gte: minCal, $lte: maxCal } }));
  if (meals.length) return meals[Math.floor(Math.random() * meals.length)];

  // 2. Slightly expanded ±10% (to account for rounding)
  meals = await MealModel.find(build({
    calories: { $gte: Math.floor(minCal * 0.9), $lte: Math.ceil(maxCal * 1.1) }
  }));
  if (meals.length) return meals[Math.floor(Math.random() * meals.length)];

  return null; // No fallback — caller must handle this
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

    const meal = await pickRandomMealForCalories(category, min, max, undefined, extra);

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
 * VARIANTE always stays on this slot's category (dinner → dinner) and
 * picks a different meal with approximately the same calories.
 * Sgarro is a separate action — never used as a "fewer calories" swap.
 * fewerCaloriesOnly is accepted from older clients and ignored.
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

  const currentMeal = await MealModel.findById(currentMealId);
  if (!currentMeal)
    throw new AppError(StatusCodes.NOT_FOUND, 'Current meal not found');

  const excludeId = new Types.ObjectId(currentMealId);
  const currentCalories = currentMeal.calories;
  const sameRange: CalorieRange =
    currentMeal.calorieRange || getCalorieRange(currentCalories);

  const findInSlot = (filter: Record<string, unknown>) =>
    MealModel.find({
      _id: { $ne: excludeId },
      category: slot.category,
      ...filter,
    });

  const around = (pct: number, minAbs: number) => {
    const delta = Math.max(Math.round(currentCalories * pct), minAbs);
    return { $gte: currentCalories - delta, $lte: currentCalories + delta };
  };

  let candidates = await findInSlot({ calorieRange: sameRange });

  if (!candidates.length) {
    candidates = await findInSlot({ calories: around(0.1, 50) });
  }

  if (!candidates.length) {
    candidates = await findInSlot({ calories: around(0.15, 80) });
  }

  if (!candidates.length) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      `Nessun altro pasto trovato per "${slot.slot}" con calorie simili. Aggiungi più pasti in questa categoria dal pannello admin.`
    );
  }

  const picked = candidates[Math.floor(Math.random() * candidates.length)];

  plan.slots[slotIndex].meal = picked._id as Types.ObjectId;
  await plan.save();

  const updated = await recalcPlan(plan._id as Types.ObjectId);
  return { plan: updated, newMeal: picked };
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
