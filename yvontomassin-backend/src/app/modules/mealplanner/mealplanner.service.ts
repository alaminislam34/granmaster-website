import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import { IMeal } from './mealplanner.interface';
import { MealModel } from './meal.model';
import { MealPlanModel } from './mealplan.model';
import { CheatModel } from '../cheat/cheat.model';
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
  'name category calories protein carbohydrates fat calorieRange image description';

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

  let totalCal  = 0;
  let totalPro  = 0;
  let totalCarb = 0;
  let totalFat  = 0;

  // Sum regular meal slots
  for (const s of withMeals.slots) {
    if (s.meal) {
      totalCal  += s.meal.calories;
      totalPro  += s.meal.protein;
      totalCarb += s.meal.carbohydrates;
      totalFat  += s.meal.fat;
    }
  }

  // Sum cheat meals — calories is a plain stored number (snapshot), not a ref
  for (const c of plan.cheatMeals) {
    totalCal += c.calories;
  }

  const maxAllowed   = plan.calorieGoal * CALORIE_TOLERANCE_MULTIPLIER;
  const isOverBudget = totalCal > maxAllowed;

  return await MealPlanModel.findByIdAndUpdate(
    planId,
    {
      dailyTotalCalories:      totalCal,
      dailyTotalProtein:       totalPro,
      dailyTotalCarbohydrates: totalCarb,
      dailyTotalFat:           totalFat,
      maxAllowedCalories:      maxAllowed,
      isOverBudget,
      status: isOverBudget ? 'red' : 'green',
    },
    { new: true }
  )
    .populate('slots.meal', MEAL_POPULATE_FIELDS)
    .populate('cheatMeals.cheatMealRef', 'name nutrition image description');
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
  excludeId?: string
) => {
  const excludeFilter = excludeId ? { $ne: new Types.ObjectId(excludeId) } : undefined;

  const build = (extra: Record<string, unknown>) => {
    const f: Record<string, unknown> = { category, ...extra };
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
  if (!data.calorieRange) {
    data.calorieRange = getCalorieRange(data.calories);
  }

  let uploadedImageUrl: string | null = null;

  if (imageFile) {
    const uploaded = await s3Service.uploadImage(imageFile, 'meals');
    uploadedImageUrl = uploaded.url;
    data.image = uploaded.url;
  }

  try {
    return await MealModel.create(data);
  } catch (error) {
    await s3Service.deleteImageBestEffort(uploadedImageUrl);
    throw error;
  }
};

const getAllMeals = async (query: Record<string, unknown> = {}) => {
  const filter: Record<string, unknown> = {};
  if (query.category) filter.category = query.category;
  if (query.calorieRange) filter.calorieRange = query.calorieRange;
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

  if (payload.calories !== undefined && !payload.calorieRange) {
    payload.calorieRange = getCalorieRange(payload.calories);
  }

  let uploadedImageUrl: string | null = null;

  if (imageFile) {
    const uploaded = await s3Service.uploadImage(imageFile, 'meals');
    uploadedImageUrl = uploaded.url;
    payload.image = uploaded.url;
  }

  let result;
  try {
    result = await MealModel.findByIdAndUpdate(id, payload, {
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
  calorieGoal: number;
  proteinGoal: number;
  carbohydratesGoal: number;
  fatGoal: number;
  slotCalorieRanges: { min: number; max: number }[];
  date?: string;
}) => {
  const {
    userId,
    mealCount,
    calorieGoal,
    proteinGoal,
    carbohydratesGoal,
    fatGoal,
    slotCalorieRanges,
    date,
  } = payload;

  const structure = MEAL_STRUCTURES[mealCount];

  if (slotCalorieRanges.length !== structure.length) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `slotCalorieRanges must have exactly ${structure.length} entries for a ${mealCount}-meal plan`
    );
  }

  const planDate = date ? new Date(date) : new Date();
  planDate.setUTCHours(0, 0, 0, 0);

  // Build slots and fill meals using exact calorie ranges
  const slots = [];
  for (let i = 0; i < structure.length; i++) {
    const { slot, category } = structure[i];
    const { min, max } = slotCalorieRanges[i];
    const targetCalories = Math.round((min + max) / 2);

    const meal = await pickRandomMealForCalories(category, min, max);

    if (!meal) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Nessun pasto trovato per "${slot}" nel range ${min}–${max} kcal. Aggiungi pasti nel range corretto o modifica le impostazioni.`
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
    .populate('slots.meal', MEAL_POPULATE_FIELDS);
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
 * Normal mode:
 *   - Find the calorieRange of the current meal (derive it from calories
 *     if the stored field is missing — backward-compatible fix).
 *   - Return a random meal in the SAME calorieRange, SAME category,
 *     that is NOT the current meal.
 *
 * Over-budget mode (isOverBudget === true):
 *   - Only suggest meals with FEWER calories than the current meal.
 */
const variante = async (payload: {
  planId: string;
  slotIndex: number;
  currentMealId: string;
}) => {
  const { planId, slotIndex, currentMealId } = payload;

  const plan = await MealPlanModel.findById(planId);
  if (!plan) throw new AppError(StatusCodes.NOT_FOUND, 'Meal plan not found');

  const slot = plan.slots[slotIndex];
  if (!slot) throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid slot index');

  const currentMeal = await MealModel.findById(currentMealId);
  if (!currentMeal)
    throw new AppError(StatusCodes.NOT_FOUND, 'Current meal not found');


  // Use stored min/max — use null check (not falsy) so 0 doesn't trigger fallback
  const rawMin = (slot as any).targetCaloriesMin;
  const rawMax = (slot as any).targetCaloriesMax;
  const slotMin = (rawMin != null && rawMin > 0) ? rawMin : Math.floor(slot.targetCalories * 0.8);
  const slotMax = (rawMax != null && rawMax > 0) ? rawMax : Math.ceil(slot.targetCalories * 1.2);

  let candidates;

  if (plan.isOverBudget) {
    candidates = await MealModel.find({
      _id: { $ne: new Types.ObjectId(currentMealId) },
      category: slot.category,
      calories: { $lt: currentMeal.calories },
    }).sort({ calories: -1 });
  } else {
    // Strict: use exact stored range
    candidates = await MealModel.find({
      _id: { $ne: new Types.ObjectId(currentMealId) },
      category: slot.category,
      calories: { $gte: slotMin, $lte: slotMax },
    });

    // Allow ±10% rounding tolerance only
    if (!candidates.length) {
      candidates = await MealModel.find({
        _id: { $ne: new Types.ObjectId(currentMealId) },
        category: slot.category,
        calories: { $gte: Math.floor(slotMin * 0.9), $lte: Math.ceil(slotMax * 1.1) },
      });
    }
  }

  if (!candidates.length) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      plan.isOverBudget
        ? 'Nessuna alternativa con meno calorie trovata per questo pasto.'
        : `Nessun altro pasto trovato nel range ${slotMin}–${slotMax} kcal per "${slot.slot}". Aggiungi più pasti in questo range dal pannello admin.`
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

  // Bug fix: prevent adding the same cheat meal twice
  const alreadyAdded = plan.cheatMeals.some(
    (c) => c.cheatMealRef.toString() === cheatMealId
  );
  if (alreadyAdded) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `"${cheat.name}" è già stato aggiunto al piano. Rimuovilo prima di aggiungerlo di nuovo.`
    );
  }

  plan.cheatMeals.push({
    cheatMealRef: cheat._id as Types.ObjectId,
    name: cheat.name,
    calories: cheat.nutrition.calories,   // snapshot — not a live ref
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

  if (cheatMealIndex < 0 || cheatMealIndex >= plan.cheatMeals.length)
    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid cheat meal index');

  plan.cheatMeals.splice(cheatMealIndex, 1);
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
  addCheatMeal,
  removeCheatMeal,
};
