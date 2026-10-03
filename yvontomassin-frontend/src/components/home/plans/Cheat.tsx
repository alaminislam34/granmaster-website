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
  nutrition: { calories: number; protein: number; carbohydrates: number; fat: number; alcohol?: number };
}

export default function Cheat({
  onClose,
  onAdd,
  existingCheatMealIds = [],
}: {
  onClose: () => void;
  onAdd: (cheatMealId: string) => Promise<void> | void;
  existingCheatMealIds?: string[];
}) {
  const [meals, setMeals]           = useState<CheatMealFromAPI[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    baseApi.get(ENDPOINTS.cheat)
      .then((res) => {
        const list: CheatMealFromAPI[] = res.data?.data ?? [];
        setMeals(list);
        // Pre-select first available cheat meal so the button is active immediately
        const firstAvailable = list.find((m) => !existingCheatMealIds.includes(m._id));
        if (firstAvailable) {
          setSelected(firstAvailable._id);
        }
      })
      .catch(() => setMeals([]))
      .finally(() => setLoading(false));
  }, [existingCheatMealIds]);

  const handleConfirm = async (mealId?: string) => {
    const targetId = mealId || selected;
    if (!targetId || submitting) return;
    setSubmitting(true);
    try {
      await onAdd(targetId);
    } finally {
      setSubmitting(false);
    }
  };

  const hasAvailableMeals = meals.some((m) => !existingCheatMealIds.includes(m._id));

  return (
    <Modal
      open
      onClose={onClose}
      title="Programma lo sgarro"
      subtitle="Scegli uno sgarro dal catalogo e aggiungilo al tuo piano."
      size="xl"
      footer={
        <div className="flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-full sm:w-auto rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={() => handleConfirm()}
            disabled={!selected || submitting || !hasAvailableMeals}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#8F00FF] px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-[#7A00E5] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed shadow-sm"
          >
            {submitting ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                AGGIUNTA IN CORSO...
              </>
            ) : (
              "AGGIUNGI LO SGARRO"
            )}
          </button>
        </div>
      }
    >
      {loading ? (
        <CheatPickerSkeleton />
      ) : meals.length === 0 ? (
        <div className="mt-8 text-center text-sm text-gray-400">
          Nessuno sgarro disponibile. Aggiungine uno dal pannello admin.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {meals.map((meal) => {
            const imgSrc = getImageUrl(meal.image);
            const isAlreadyAdded = existingCheatMealIds.includes(meal._id);
            const isSelected = selected === meal._id;

            return (
              <div
                key={meal._id}
                onClick={() => {
                  if (!isAlreadyAdded && !submitting) {
                    setSelected(meal._id);
                  }
                }}
                className={`flex flex-col items-start overflow-hidden rounded-xl border p-0 text-left transition-all cursor-pointer ${
                  isAlreadyAdded
                    ? "opacity-50 border-gray-200 bg-slate-50 cursor-not-allowed"
                    : isSelected
                    ? "ring-2 ring-[#8F00FF] border-[#8F00FF] shadow-md bg-purple-50/20"
                    : "border-gray-200 hover:border-[#8F00FF]/60 hover:shadow-sm"
                }`}
              >
                <div className="relative w-full">
                  <SquareMealImage src={imgSrc} alt={meal.name} fallback="🍔" />
                  
                  {/* Selection check indicator */}
                  {!isAlreadyAdded && (
                    <div
                      className={`absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-[#8F00FF] text-white shadow-md scale-105"
                          : "bg-white/90 text-transparent border border-slate-300 shadow-sm"
                      }`}
                    >
                      ✓
                    </div>
                  )}

                  {isAlreadyAdded && (
                    <span className="absolute top-2 right-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs">
                      Già aggiunto
                    </span>
                  )}
                </div>

                <div className="w-full px-4 py-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-900">{meal.name}</span>
                      {isSelected && !isAlreadyAdded && (
                        <span className="rounded-full bg-[#8F00FF]/10 text-[#8F00FF] px-2 py-0.5 text-[10px] font-bold">
                          Selezionato
                        </span>
                      )}
                      {isAlreadyAdded && (
                        <span className="text-[10px] font-semibold text-slate-500">Nel piano</span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 line-clamp-2">{meal.description}</div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 text-[11px] text-gray-500">
                    <span className="font-bold text-[#8F00FF]">{meal.nutrition?.calories ?? 0} kcal</span>
                    <span>P: {meal.nutrition?.protein ?? 0}g</span>
                    <span>C: {meal.nutrition?.carbohydrates ?? 0}g</span>
                    <span>F: {meal.nutrition?.fat ?? 0}g</span>
                    {Boolean(meal.nutrition?.alcohol) && <span>A: {meal.nutrition?.alcohol}g</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
