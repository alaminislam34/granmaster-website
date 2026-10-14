import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import { DietaryType, INutrition } from './nutrition.interface';
import { NutritionModel } from './nutrition.model';
import { MealModel } from '../mealplanner/meal.model';
import { getCalorieRange } from '../mealplanner/mealplanner.constant';
import { s3Service } from '../../services/s3.service';

// ─── Valid MealPlanner categories (Dessert/Drink not in MealPlanner) ──────────
const MEAL_PLANNER_CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

// Meat / Fish / Vegan apply only to Lunch and Dinner
const DIETARY_CATEGORIES = ['Lunch', 'Dinner'];
// Max tags per meal, where "Fast" (isQuickMeal) counts as one tag
const MAX_TAGS_PER_MEAL = 2;

/**
 * Normalises dietary tags and enforces the rules:
 * - Meat/Fish/Vegan only for Lunch and Dinner (otherwise cleared)
 * - At most two tags in total, counting "Fast" (isQuickMeal)
 */
const normalizeDietary = (
  category: string,
  dietaryTypes: DietaryType[] | undefined,
  isQuickMeal: boolean
): DietaryType[] => {
  const allowed = DIETARY_CATEGORIES.includes(category)
    ? [...new Set(dietaryTypes ?? [])]
    : [];

  if (allowed.length + (isQuickMeal ? 1 : 0) > MAX_TAGS_PER_MEAL) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Puoi selezionare al massimo due tag (carne, pesce, vegano, veloce).'
    );
  }
  return allowed;
};

async function syncToMealPlanner(
  nutritionId: string,
  data: Partial<INutrition>
) {
  const cat = data.category;
  if (!cat || !MEAL_PLANNER_CATEGORIES.includes(cat)) return;

  const calories = data.nutrition?.calories ?? 0;

  await MealModel.findOneAndUpdate(
    { nutritionRef: nutritionId },
    {
      nutritionRef: nutritionId,
      name: data.name,
      category: cat,
      calories,
      protein: data.nutrition?.protein ?? 0,
      carbohydrates: data.nutrition?.carbohydrates ?? 0,
      fat: data.nutrition?.fat ?? 0,
      calorieRange: getCalorieRange(calories),
      portionType: data.portionType ?? 'Medium',
      ...(typeof data.image === 'string' && data.image.trim()
        ? { image: data.image }
        : {}),
      description: data.description ?? null,
      isQuickMeal: data.isQuickMeal === true,
      dietaryTypes: data.dietaryTypes ?? [],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

// ─── Create ───────────────────────────────────────────────────────────────────
const createNutrition = async (
  data: INutrition,
  imageFile?: Express.Multer.File
) => {
  const payload: Partial<INutrition> = { ...data };
  delete payload.image;
  payload.isQuickMeal = payload.isQuickMeal === true;
  payload.dietaryTypes = normalizeDietary(
    payload.category ?? '',
    payload.dietaryTypes,
    payload.isQuickMeal
  );

  let uploadedImageUrl: string | null = null;

  if (imageFile) {
    const uploaded = await s3Service.uploadImage(imageFile, 'nutrition');
    uploadedImageUrl = uploaded.url;
    payload.image = uploaded.url;
  }

  let result;
  try {
    result = await NutritionModel.create(payload as INutrition);
  } catch (error) {
    await s3Service.deleteImageBestEffort(uploadedImageUrl);
    throw error;
  }

  syncToMealPlanner(result._id.toString(), {
    name: result.name,
    category: result.category,
    nutrition: result.nutrition,
    portionType: result.portionType,
    image: result.image,
    description: result.description,
    isQuickMeal: result.isQuickMeal,
    dietaryTypes: result.dietaryTypes,
  }).catch(() => {});
  return result;
};

// ─── Get all ──────────────────────────────────────────────────────────────────
const getAllNutritions = async (query: Record<string, unknown> = {}) => {
  const filter: Record<string, unknown> = {};
  if (query.category) filter.category = query.category;
  if (query.portionType) filter.portionType = query.portionType;
  if (query.isQuickMeal === 'true' || query.isQuickMeal === true) {
    filter.isQuickMeal = true;
  }
  return await NutritionModel.find(filter).sort({ createdAt: -1 });
};

// ─── Get single ───────────────────────────────────────────────────────────────
const getSingleNutrition = async (id: string) => {
  return await NutritionModel.findById(id);
};

// ─── Update ───────────────────────────────────────────────────────────────────
const updateNutrition = async (
  id: string,
  payload: Partial<INutrition>,
  imageFile?: Express.Multer.File
) => {
  const existing = await NutritionModel.findById(id);
  if (!existing) return null;

  const safePayload: Partial<INutrition> = { ...payload };
  delete safePayload.image;

  // Validate against the merged result, since a partial update may change only one of the fields
  safePayload.dietaryTypes = normalizeDietary(
    payload.category ?? existing.category,
    payload.dietaryTypes ?? existing.dietaryTypes,
    payload.isQuickMeal ?? existing.isQuickMeal === true
  );

  let uploadedImageUrl: string | null = null;

  if (imageFile) {
    const uploaded = await s3Service.uploadImage(imageFile, 'nutrition');
    uploadedImageUrl = uploaded.url;
    safePayload.image = uploaded.url;
  }

  let result;
  try {
    result = await NutritionModel.findByIdAndUpdate(id, safePayload, {
      new: true,
      runValidators: true,
    });
  } catch (error) {
    await s3Service.deleteImageBestEffort(uploadedImageUrl);
    throw error;
  }

  if (result) {
    syncToMealPlanner(id, {
      name: result.name,
      category: result.category,
      nutrition: result.nutrition,
      portionType: result.portionType,
      image: result.image,
      description: result.description,
      isQuickMeal: result.isQuickMeal,
      dietaryTypes: result.dietaryTypes,
    }).catch(() => {});

    if (uploadedImageUrl && existing.image && existing.image !== uploadedImageUrl) {
      await s3Service.deleteImageBestEffort(existing.image);
    }
  }
  return result;
};

// ─── Delete ───────────────────────────────────────────────────────────────────
const deleteNutrition = async (id: string) => {
  const result = await NutritionModel.findByIdAndDelete(id);
  if (result) {
    await MealModel.deleteOne({ nutritionRef: id }).catch(() => {});
    await s3Service.deleteImageBestEffort(result.image);
  }
  return result;
};

// ─── Bulk sync all nutrition → MealPlanner Meal ───────────────────────────────
const syncAllNutritionToMealPlanner = async () => {
  const all = await NutritionModel.find();
  let synced = 0;
  let skipped = 0;
  for (const n of all) {
    if (!MEAL_PLANNER_CATEGORIES.includes(n.category)) { skipped++; continue; }
    await syncToMealPlanner(n._id.toString(), {
      name: n.name,
      category: n.category,
      nutrition: n.nutrition,
      portionType: n.portionType,
      image: n.image,
      description: n.description,
      isQuickMeal: n.isQuickMeal,
      dietaryTypes: n.dietaryTypes,
    });
    synced++;
  }

  return { synced, skipped, total: all.length };
};

export const nutritionService = {
  createNutrition,
  getAllNutritions,
  getSingleNutrition,
  updateNutrition,
  deleteNutrition,
  syncAllNutritionToMealPlanner,
};
