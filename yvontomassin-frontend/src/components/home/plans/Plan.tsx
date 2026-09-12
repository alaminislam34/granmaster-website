"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useCallback, Suspense } from "react";
import { FiRefreshCw, FiTool, FiX } from "react-icons/fi";
import baseApi from "@/src/api/baseApi";
import { ENDPOINTS } from "@/src/api/endPoints";
import { getCurrentUser } from "@/src/lib/authService";
import { toast } from "sonner";
import Cheat from "./Cheat";
import PlanSkeleton from "./PlanSkeleton";
import { getImageUrl } from "@/src/lib/imageUrl";
import SquareMealImage from "@/src/components/Shared/SquareMealImage";
import { downloadSavedPdf, saveContent } from "@/src/lib/savedContent";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MealInSlot {
  _id: string; name: string; category: string;
  calories: number; protein: number; carbohydrates: number; fat: number;
  calorieRange: string; image?: string; description?: string;
}

interface Slot {
  slot: string; category: string; targetCalories: number;
  meal: MealInSlot | null;
}

interface CheatMealEntry {
  cheatMealRef: { _id: string; name: string; nutrition: { calories: number; protein: number; carbohydrates: number; fat: number }; image?: string; description?: string };
  name: string; calories: number;
}

interface MealPlan {
  _id: string;
  mealCount: number;
  calorieGoal: number; proteinGoal: number; carbohydratesGoal: number; fatGoal: number;
  slots: Slot[];
  cheatMeals: CheatMealEntry[];
  dailyTotalCalories: number; dailyTotalProtein: number;
  dailyTotalCarbohydrates: number; dailyTotalFat: number;
  maxAllowedCalories: number; isOverBudget: boolean; status: "green" | "red";
}

const SLOT_LABEL: Record<string, string> = {
  Breakfast: "COLAZIONE", Snack: "MERENDA", "Snack 2": "MERENDA 2",
  "Snack 3": "MERENDA 3", Lunch: "PRANZO", Dinner: "CENA",
};

function PlanContent() {
  const searchParams = useSearchParams();
  const planId = searchParams.get("planId");

  const [plan, setPlan]             = useState<MealPlan | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [swapping, setSwapping]     = useState<number | null>(null);
  const [isCheatOpen, setIsCheatOpen] = useState(false);

  // ─── Fetch plan ─────────────────────────────────────────────────────────────
  const fetchPlan = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // If planId is in the URL, fetch that specific plan
      if (planId) {
        const res = await baseApi.get(`${ENDPOINTS.mealPlannerPlanById}/${planId}`);
        setPlan(res.data?.data ?? null);
        return;
      }

      // No planId — try to load the most recently generated plan for this user
      const user = getCurrentUser();
      if (!user?.id) { setError(""); setPlan(null); return; }

      const res = await baseApi.get(`${ENDPOINTS.mealPlannerUserPlans}/${user.id}`);
      const plans: MealPlan[] = res.data?.data ?? [];
      if (plans.length > 0) {
        // Plans are sorted by date descending, first = most recent.
        // Fetch the full populated plan so cheat meals etc. are all present.
        const fullRes = await baseApi.get(`${ENDPOINTS.mealPlannerPlanById}/${plans[0]._id}`);
        setPlan(fullRes.data?.data ?? null);
      } else {
        setPlan(null);
      }
    } catch {
      setError("Impossibile caricare il piano. Riprova.");
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  // ─── Variante (swap one meal) ────────────────────────────────────────────────
  async function handleVariante(slotIndex: number) {
    if (!plan) return;
    const slot = plan.slots[slotIndex];
    if (!slot.meal) return;
    setSwapping(slotIndex);
    try {
      const res = await baseApi.post(ENDPOINTS.mealPlannerVariante, {
        planId: plan._id,
        slotIndex,
        currentMealId: slot.meal._id,
      });
      const updatedPlan = res.data?.data?.plan ?? res.data?.data ?? null;

      if (updatedPlan) {
        setPlan(updatedPlan);
        toast.success("Pasto cambiato con successo!");
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      const msg = e?.response?.data?.message || "Variante fallita.";
      toast.error(msg);
    } finally {
      setSwapping(null);
    }
  }

  // ─── Add cheat meal ──────────────────────────────────────────────────────────
  async function handleAddCheat(cheatMealId: string) {
    if (!plan) return;
    try {
      const res = await baseApi.post(ENDPOINTS.mealPlannerCheatDay, {
        planId: plan._id,
        cheatMealId,
      });
      setPlan(res.data?.data ?? null);
      setIsCheatOpen(false);
      toast.success("Sgarro aggiunto!");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      const msg = e?.response?.data?.message || "Aggiunta sgarro fallita.";
      toast.error(msg);
    }
  }

  // ─── Remove cheat meal ───────────────────────────────────────────────────────
  async function handleRemoveCheat(cheatMealIndex: number) {
    if (!plan) return;
    try {
      const res = await baseApi.post(ENDPOINTS.mealPlannerRemoveCheat, {
        planId: plan._id,
        cheatMealIndex,
      });
      setPlan(res.data?.data ?? null);
      toast.success("Sgarro rimosso.");
    } catch {
      toast.error("Rimozione fallita.");
    }
  }

  async function handleDeleteMeal(slotIndex: number) {
    if (!plan) return;
    try {
      const res = await baseApi.post(ENDPOINTS.mealPlannerClearSlot, {
        planId: plan._id,
        slotIndex,
      });
      setPlan(res.data?.data ?? null);
      toast.success("Pasto eliminato dalla giornata.");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Eliminazione fallita.");
    }
  }

  function buildSnapshot(includeStrategy = false) {
    return {
      calorieGoal: plan!.calorieGoal,
      dailyTotalCalories: plan!.dailyTotalCalories,
      dailyTotalProtein: plan!.dailyTotalProtein,
      dailyTotalCarbohydrates: plan!.dailyTotalCarbohydrates,
      dailyTotalFat: plan!.dailyTotalFat,
      proteinGoal: plan!.proteinGoal,
      carbohydratesGoal: plan!.carbohydratesGoal,
      fatGoal: plan!.fatGoal,
      maxAllowedCalories: plan!.maxAllowedCalories,
      slots: plan!.slots.map((slot) => ({
        slot: slot.slot,
        category: slot.category,
        meal: slot.meal
          ? {
              name: slot.meal.name,
              calories: slot.meal.calories,
              protein: slot.meal.protein,
              carbohydrates: slot.meal.carbohydrates,
              fat: slot.meal.fat,
              description: slot.meal.description ?? null,
              image: slot.meal.image ?? null,
            }
          : null,
      })),
      cheatMeals: plan!.cheatMeals.map((cm) => ({
        name: cm.name,
        calories: cm.calories,
        description: cm.cheatMealRef?.description ?? null,
        image: cm.cheatMealRef?.image ?? null,
      })),
      instructions: includeStrategy
        ? [
            "Usa VARIANTE per sostituire un pasto con un altro della stessa categoria e calorie simili.",
            "Usa ELIMINA QUESTO PASTO se vuoi togliere quel pasto dalla giornata.",
            "Aggiungi uno sgarro con AGGIUNGI LO SGARRO — è l’unica eccezione al piano.",
          ]
        : [],
    };
  }

  async function persistAndDownload(type: "day" | "strategy") {
    if (!plan) return;
    const user = getCurrentUser();
    if (!user?.id) {
      toast.error("Accedi per salvare e scaricare il PDF.");
      return;
    }
    try {
      const saved = await saveContent({
        userId: user.id,
        type,
        title: `${type === "strategy" ? "Strategia" : "Giornata"} ${new Date().toLocaleDateString("it-IT")}`,
        snapshot: buildSnapshot(type === "strategy"),
      });
      await downloadSavedPdf(saved._id, `${saved.title}.pdf`);
      toast.success(
        type === "strategy"
          ? "Strategia salvata. PDF scaricato."
          : "Giornata salvata. PDF scaricato."
      );
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Salvataggio o PDF fallito.");
    }
  }

  function handleSaveDay() {
    void persistAndDownload("day");
  }

  function handleSaveStrategy() {
    void persistAndDownload("strategy");
  }

  if (loading) {
    return <PlanSkeleton />;
  }

  if (error || !plan) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] px-4">
        <div className="rounded-2xl bg-white p-8 text-center shadow-md max-w-md w-full">
          {error ? (
            <p className="text-red-500 font-medium">{error}</p>
          ) : (
            <>
              <div className="text-4xl mb-4">🍽️</div>
<p className="text-gray-600 font-medium">
  Nessun piano trovato.
</p>
<p className="mt-1 text-sm text-gray-400">
  Torna alla home page e crea un piano.
</p>
            </>
          )}
          <Link href="/" className="mt-6 inline-block rounded-lg bg-[#8F00FF] px-6 py-2 text-sm font-semibold text-white hover:bg-[#7A00E5]">
            Torna alla home
          </Link>
        </div>
      </div>
    );
  }

  const totalCal = plan.dailyTotalCalories;
  const proteinPct = plan.proteinGoal ? Math.min(100, Math.round((plan.dailyTotalProtein / plan.proteinGoal) * 100)) : 0;
  const carbsPct = plan.carbohydratesGoal ? Math.min(100, Math.round((plan.dailyTotalCarbohydrates / plan.carbohydratesGoal) * 100)) : 0;
  const fatPct = plan.fatGoal ? Math.min(100, Math.round((plan.dailyTotalFat / plan.fatGoal) * 100)) : 0;
  // calPct: allow past 100 so the bar visually overflows when over budget
  const calPct = plan.calorieGoal ? Math.round((totalCal / plan.calorieGoal) * 100) : 0;
  const calBarPct = Math.min(100, calPct); // bar capped at 100% visually
  const overBy = plan.isOverBudget ? totalCal - plan.maxAllowedCalories : 0;

  return (
    <section className="bg-[#f5f4f0] py-2 md:py-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-12">

        {/* Budget alert */}
        {plan.isOverBudget && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700">
            ⚠️ Hai superato il budget calorico ({totalCal} / {plan.calorieGoal} kcal). Usa Variante per ridurre le calorie.
          </div>
        )}

        {/* Cheat meals added */}
        {plan.cheatMeals.length > 0 && (
          <div className="mb-6 space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">Sgarri selezionati</h4>
            {plan.cheatMeals.map((cm, i) => {
              const ref = cm.cheatMealRef;
              const imgSrc = getImageUrl(ref?.image);
              return (
                <div key={i} className="rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-3">
                    <div className="md:col-span-1 bg-gray-50">
                      <SquareMealImage src={imgSrc} alt={cm.name} fallback="🍔" />
                    </div>
                    <div className="md:col-span-2 p-6">
                      <div className="text-xs text-gray-400 uppercase">Selezione Gourmet</div>
                      <h3 className="mt-2 text-xl font-semibold text-gray-900">{cm.name}</h3>
                      {ref?.description && <p className="mt-1 text-sm text-gray-500">{ref.description}</p>}
                      <div className="mt-4 grid grid-cols-4 gap-4 text-sm text-gray-600">
                        {[
                          { v: cm.calories, l: "Calorie" },
                          { v: ref?.nutrition?.protein ?? 0, l: "Proteina", suffix: "g" },
                          { v: ref?.nutrition?.carbohydrates ?? 0, l: "Carboidrati", suffix: "g" },
                          { v: ref?.nutrition?.fat ?? 0, l: "Grasso", suffix: "g" },
                        ].map((item) => (
                          <div key={item.l}>
                            <div className="text-sm font-semibold text-gray-900">{item.v}{item.suffix ?? " kcal"}</div>
                            <div className="text-xs text-gray-400">{item.l}</div>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => handleRemoveCheat(i)}
                        className="mt-4 inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
                      >
                        <FiX className="text-xs" /> Rimuovi
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-2 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          {/* Meal slots */}
          <div className="grid gap-6 sm:grid-cols-2">
            {plan.slots.map((slot, idx) => {
              const meal = slot.meal;
              const visibleMeal = meal;
              const imgSrc = getImageUrl(visibleMeal?.image);
              return (
                <article
                  key={`${slot.slot}-${idx}`}
                  className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_10px_25px_-20px_rgba(15,23,42,0.25)] transition duration-300 hover:-translate-y-1 hover:border-[#8F00FF]"
                >
                  <div className="relative">
                    <SquareMealImage src={imgSrc} alt={visibleMeal?.name ?? slot.slot} className="rounded-xl" />
                    <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#8F00FF] shadow-sm">
                      {SLOT_LABEL[slot.slot] ?? slot.slot}
                    </span>
                    {plan.isOverBudget && visibleMeal && (
                      <span className="absolute right-3 top-3 rounded-full bg-red-100 px-2 py-1 text-[10px] font-semibold text-red-600">
                        OVER
                      </span>
                    )}
                  </div>

                  <div className="pt-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {visibleMeal
                        ? visibleMeal.name
                        : <span className="text-gray-400 italic text-sm">Nessun pasto disponibile</span>}
                    </h3>
                    {visibleMeal?.description && (
                      <p className="mt-1 text-[12px] text-gray-500 leading-snug">{visibleMeal.description}</p>
                    )}
                    <div className="mt-3 border-t border-gray-100 pt-3" />

                    {visibleMeal && (
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        {[
                          { v: visibleMeal.calories,            l: "Kcal",        color: "text-[#8F00FF]" },
                          { v: `${visibleMeal.protein}g`,       l: "Proteina",    color: "" },
                          { v: `${visibleMeal.carbohydrates}g`, l: "Carboidrati", color: "" },
                          { v: `${visibleMeal.fat}g`,           l: "Grasso",      color: "" },
                        ].map((item, i) => (
                          <div key={item.l} className={`flex-1 ${i > 0 ? "px-4 border-l border-gray-200" : ""}`}>
                            <div className={`text-sm font-semibold ${item.color || "text-gray-800"}`}>{item.v}</div>
                            <div className="text-[11px] text-gray-400">{item.l}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => handleVariante(idx)}
                      disabled={swapping === idx || !meal}
                      className="mt-4 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:border-[#8F00FF] flex items-center justify-center gap-2 bg-white disabled:opacity-50 transition"
                    >
                      <FiRefreshCw className={`text-sm ${swapping === idx ? "animate-spin" : ""}`} />
                      {swapping === idx ? "Cambio..." : "VARIANTE"}
                    </button>
                    {meal && (
                      <button
                        onClick={() => handleDeleteMeal(idx)}
                        className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition"
                      >
                        ELIMINA QUESTO PASTO
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {/* Sidebar — daily goals */}
          <aside className="h-fit rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_10px_25px_-20px_rgba(15,23,42,0.25)]">
            <div className="text-lg font-semibold text-gray-900">Obiettivo giornaliero</div>
            <div className="mt-1 text-xs text-gray-500">
              {totalCal} / {plan.calorieGoal} kcal
            </div>

            {/* Calorie bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] font-semibold text-gray-700">
                <span>Calorie</span>
                <span className={plan.isOverBudget ? "text-red-600" : ""}>
                  {totalCal} / {plan.calorieGoal} kcal
                  {plan.isOverBudget && (
                    <span className="ml-1 font-bold">(+{overBy} oltre il limite)</span>
                  )}
                </span>
              </div>
              {/* Track */}
              <div className="relative mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${plan.isOverBudget ? "bg-red-500" : "bg-[#8F00FF]"}`}
                  style={{ width: `${calBarPct}%` }}
                />
                {/* Max-allowed marker at 83.3% (calorieGoal/maxAllowed = 1/1.2) */}
                <div
                  className="absolute top-0 h-2 w-0.5 bg-orange-400 opacity-70"
                  style={{ left: `${Math.min(100, Math.round((plan.calorieGoal / plan.maxAllowedCalories) * 100))}%` }}
                  title={`Limite: ${plan.maxAllowedCalories} kcal`}
                />
              </div>
              {plan.isOverBudget && (
                <p className="mt-1 text-[10px] text-red-500 font-medium">
                  Limite massimo: {plan.maxAllowedCalories} kcal (+20%)
                </p>
              )}
            </div>

            <div className="mt-4 space-y-4 text-xs text-gray-600">
              {[
                { label: "Proteina",    current: plan.dailyTotalProtein,      goal: plan.proteinGoal,      pct: proteinPct, unit: "g" },
                { label: "Carboidrati", current: plan.dailyTotalCarbohydrates, goal: plan.carbohydratesGoal, pct: carbsPct, unit: "g" },
                { label: "Grassi",      current: plan.dailyTotalFat,           goal: plan.fatGoal,          pct: fatPct, unit: "g" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-gray-700">
                    <span>{item.label}</span>
                    <span>{item.current}{item.unit} / {item.goal}{item.unit}</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                    <div className="h-1.5 rounded-full bg-[#8F00FF] transition-all" style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Status indicator */}
            <div className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold ${
              plan.isOverBudget
                ? "bg-red-50 text-red-600 border border-red-200"
                : "bg-green-50 text-green-700 border border-green-200"
            }`}>
              <span className={`inline-flex h-2 w-2 rounded-full ${plan.isOverBudget ? "bg-red-500 animate-pulse" : "bg-green-600"}`} />
              {plan.isOverBudget
                ? `BUDGET SUPERATO — usa Variante per ridurre`
                : "OBIETTIVO IN CORSO"}
            </div>

            {/* Cheat day button */}
            <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">Programma lo sgarro</p>
              <button
                onClick={() => setIsCheatOpen(true)}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#8F00FF] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#7A00E5]"
              >
                <FiTool className="text-sm" />
                AGGIUNGI LO SGARRO
              </button>
              <p className="mt-3 text-[11px] text-gray-500">
                Aggiungi uno sgarro dal catalogo. I totali si ricalcolano automaticamente.
              </p>
              <button
                onClick={handleSaveDay}
                className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:border-[#8F00FF]"
              >
                SALVA QUESTA GIORNATA
              </button>
              <button
                onClick={handleSaveStrategy}
                className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:border-[#8F00FF]"
              >
                SALVA STRATEGIA
              </button>
            </div>
          </aside>
        </div>
      </div>

      {isCheatOpen && (
        <Cheat
          onClose={() => setIsCheatOpen(false)}
          onAdd={handleAddCheat}
        />
      )}
    </section>
  );
}

export default function Plan() {
  return (
    <Suspense fallback={<PlanSkeleton />}>
      <PlanContent />
    </Suspense>
  );
}
