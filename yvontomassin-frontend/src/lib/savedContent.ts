import baseApi from "@/src/api/baseApi";
import { ENDPOINTS } from "@/src/api/endPoints";

export type SavedContentType = "day" | "strategy";

export interface SavedMealSnapshot {
  name: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  description?: string | null;
  image?: string | null;
}

export interface SavedSnapshot {
  calorieGoal: number;
  dailyTotalCalories: number;
  dailyTotalProtein: number;
  dailyTotalCarbohydrates: number;
  dailyTotalFat: number;
  proteinGoal?: number;
  carbohydratesGoal?: number;
  fatGoal?: number;
  maxAllowedCalories?: number;
  slots: {
    slot: string;
    category: string;
    meal: SavedMealSnapshot | null;
  }[];
  cheatMeals: {
    name: string;
    calories: number;
    description?: string | null;
    image?: string | null;
  }[];
  instructions?: string[];
}

export interface SavedContentItem {
  _id: string;
  type: SavedContentType;
  title: string;
  createdAt: string;
  snapshot: SavedSnapshot;
}

export async function saveContent(payload: {
  userId: string;
  type: SavedContentType;
  title: string;
  snapshot: SavedSnapshot;
}) {
  const res = await baseApi.post(ENDPOINTS.saved, payload);
  return res.data?.data as SavedContentItem;
}

export async function listSavedContent(userId: string) {
  const res = await baseApi.get(ENDPOINTS.saved, { params: { userId } });
  return (res.data?.data ?? []) as SavedContentItem[];
}

export async function deleteSavedContent(id: string) {
  await baseApi.delete(`${ENDPOINTS.saved}/${id}`);
}

export async function downloadSavedPdf(id: string, filename?: string) {
  const res = await baseApi.get(`${ENDPOINTS.saved}/${id}/pdf`, {
    responseType: "blob",
  });
  const blob = new Blob([res.data], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `documento-${id}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
