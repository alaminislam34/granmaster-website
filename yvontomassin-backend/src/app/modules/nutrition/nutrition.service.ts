import { INutrition } from './nutrition.interface';
import { NutritionModel } from './nutrition.model';
import { MealModel } from '../mealplanner/meal.model';
import { getCalorieRange } from '../mealplanner/mealplanner.constant';
import { s3Service } from '../../services/s3.service';

// ─── Valid MealPlanner categories (Dessert/Drink not in MealPlanner) ──────────
const MEAL_PLANNER_CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

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
      ...(typeof data.image === 'string' && data.image.trim()
        ? { image: data.image }
        : {}),
      description: data.description ?? null,
      isQuickMeal: data.isQuickMeal === true,
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
    image: result.image,
    description: result.description,
    isQuickMeal: result.isQuickMeal,
  }).catch(() => {});
  return result;
};

// ─── Get all ──────────────────────────────────────────────────────────────────
const getAllNutritions = async () => {
  return await NutritionModel.find().sort({ createdAt: -1 });
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
      image: result.image,
      description: result.description,
      isQuickMeal: result.isQuickMeal,
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
      image: n.image,
      description: n.description,
      isQuickMeal: n.isQuickMeal,
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
