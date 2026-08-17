"use client";

import { useState, useEffect } from "react";
import baseApi from "@/src/api/baseApi";
import { ENDPOINTS } from "@/src/api/endPoints";
import { getImageUrl } from "@/src/lib/imageUrl";

interface CheatMealFromAPI {
  _id: string;
  name: string;
  description: string;
  image?: string;
  nutrition: { calories: number; protein: number; carbohydrates: number; fat: number };
}

export default function Cheat({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (cheatMealId: string) => void;
}) {
  const [meals, setMeals]       = useState<CheatMealFromAPI[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    baseApi.get(ENDPOINTS.cheat)
      .then((res) => setMeals(res.data?.data ?? []))
      .catch(() => setMeals([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4">
      <div className="w-full max-w-3xl lg:max-w-5xl rounded-2xl bg-white p-6 md:p-8 lg:p-12 max-h-[90vh] overflow-auto">
        <h2 className="text-center text-xl font-semibold text-black">Seleziona Cheat Pasto</h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          Scegli un pasto cheat dal tuo catalogo.
        </p>

        {loading ? (
          <div className="mt-8 text-center text-gray-400 text-sm">Caricamento pasti cheat...</div>
        ) : meals.length === 0 ? (
          <div className="mt-8 text-center text-gray-400 text-sm">
            Nessun pasto cheat disponibile. Aggiungine uno dal pannello admin.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {meals.map((meal) => {
              const imgSrc = getImageUrl(meal.image);
              return (
                <button
                  key={meal._id}
                  onClick={() => setSelected(meal._id)}
                  className={`flex flex-col items-start overflow-hidden rounded-xl border p-0 text-left transition-shadow ${
                    selected === meal._id
                      ? "ring-1 ring-[#8F00FF] border-[#8F00FF] shadow-md"
                      : "border-gray-100 hover:border-[#8F00FF]"
                  }`}
                >
                  <div className="w-full overflow-hidden bg-gray-100">
                    {imgSrc
                      ? <img src={imgSrc} alt={meal.name} className="h-28 sm:h-36 lg:h-44 w-full object-cover" />
                      : <div className="h-28 sm:h-36 lg:h-44 w-full flex items-center justify-center text-5xl bg-gray-50">🍔</div>}
                  </div>
                  <div className="w-full px-4 py-3">
                    <div className="text-sm font-semibold text-gray-900">{meal.name}</div>
                    <div className="mt-1 text-xs text-gray-500 line-clamp-2">{meal.description}</div>
                    <div className="mt-2 flex gap-3 text-[11px] text-gray-500">
                      <span className="font-semibold text-[#8F00FF]">{meal.nutrition.calories} kcal</span>
                      <span>P: {meal.nutrition.protein}g</span>
                      <span>C: {meal.nutrition.carbohydrates}g</span>
                      <span>F: {meal.nutrition.fat}g</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse sm:flex-row items-center sm:justify-end gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto rounded-full border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annulla
          </button>
          <button
            onClick={() => { if (selected) onAdd(selected); }}
            disabled={!selected}
            className="w-full sm:w-auto rounded-full bg-[#8F00FF] hover:bg-[#7A00E5] text-white px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:bg-gray-200 transition"
          >
            Aggiungi Cheat Meal
          </button>
        </div>
      </div>
    </div>
  );
}
