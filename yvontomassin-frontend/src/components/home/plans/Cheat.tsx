"use client";

import { useState, useEffect } from "react";
import baseApi from "@/src/api/baseApi";
import { ENDPOINTS } from "@/src/api/endPoints";
import { getImageUrl } from "@/src/lib/imageUrl";
import SquareMealImage from "@/src/components/Shared/SquareMealImage";
import Modal from "@/src/components/Shared/Modal";
import { CheatPickerSkeleton } from "@/src/components/Shared/skeletons";

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
    <Modal open onClose={onClose} title="Programma lo sgarro" size="xl">
      <p className="-mt-2 text-center text-sm text-gray-500">
        Scegli uno sgarro dal catalogo.
      </p>

      {loading ? (
        <CheatPickerSkeleton />
      ) : meals.length === 0 ? (
        <div className="mt-8 text-center text-sm text-gray-400">
          Nessuno sgarro disponibile. Aggiungine uno dal pannello admin.
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
                <SquareMealImage src={imgSrc} alt={meal.name} fallback="🍔" />
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

      <div className="mt-6 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-end">
        <button
          onClick={onClose}
          className="w-full rounded-full border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
        >
          Annulla
        </button>
        <button
          onClick={() => { if (selected) onAdd(selected); }}
          disabled={!selected}
          className="w-full rounded-full bg-[#8F00FF] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7A00E5] disabled:bg-gray-200 disabled:opacity-50 sm:w-auto"
        >
          AGGIUNGI LO SGARRO
        </button>
      </div>
    </Modal>
  );
}
