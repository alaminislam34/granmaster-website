"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import logo from "../../assets/hero.svg";
import { FiSettings } from "react-icons/fi";
import baseApi from "@/src/api/baseApi";
import { ENDPOINTS } from "@/src/api/endPoints";
import { getCurrentUser } from "@/src/lib/authService";
import { toast } from "sonner";

const MEAL_STRUCTURES: Record<number, { slot: string; category: string }[]> = {
  3: [
    { slot: "Breakfast", category: "Breakfast" },
    { slot: "Lunch",     category: "Lunch"     },
    { slot: "Dinner",    category: "Dinner"    },
  ],
  4: [
    { slot: "Breakfast", category: "Breakfast" },
    { slot: "Snack",     category: "Snack"     },
    { slot: "Lunch",     category: "Lunch"     },
    { slot: "Dinner",    category: "Dinner"    },
  ],
  5: [
    { slot: "Breakfast", category: "Breakfast" },
    { slot: "Snack",     category: "Snack"     },
    { slot: "Lunch",     category: "Lunch"     },
    { slot: "Snack 2",   category: "Snack"     },
    { slot: "Dinner",    category: "Dinner"    },
  ],
  6: [
    { slot: "Breakfast", category: "Breakfast" },
    { slot: "Snack",     category: "Snack"     },
    { slot: "Lunch",     category: "Lunch"     },
    { slot: "Snack 2",   category: "Snack"     },
    { slot: "Dinner",    category: "Dinner"    },
    { slot: "Snack 3",   category: "Snack"     },
  ],
};

const SLOT_LABEL: Record<string, string> = {
  Breakfast: "Colazione",
  Snack:     "Merenda",
  "Snack 2": "Merenda 2",
  "Snack 3": "Merenda 3",
  Lunch:     "Pranzo",
  Dinner:    "Cena",
};

const CALORIE_RANGE_OPTIONS = [
  { value: 100, label: "100-200", min: 100, max: 200 },
  { value: 201, label: "201-300", min: 201, max: 300 },
  { value: 301, label: "301-400", min: 301, max: 400 },
  { value: 401, label: "401-500", min: 401, max: 500 },
  { value: 501, label: "501-600", min: 501, max: 600 },
  { value: 601, label: "601-700", min: 601, max: 700 },
  { value: 701, label: "701-800", min: 701, max: 800 },
  { value: 801, label: "801-900", min: 801, max: 900 },
];

const DEFAULT_SLOT_CALORIES: Record<string, number> = {
  Breakfast: 301, Snack: 201, "Snack 2": 201, "Snack 3": 201, Lunch: 401, Dinner: 401,
};


const STORAGE_KEY = "homeSettings_v3";

type SlotMacro = { proteinMin: string; proteinMax: string; carbMin: string; carbMax: string; fatMin: string; fatMax: string };
const DEFAULT_MACRO: SlotMacro = { proteinMin: "", proteinMax: "", carbMin: "", carbMax: "", fatMin: "", fatMax: "" };

function loadSettings() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
}
function saveSettings(data: object) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function toRange(cal: number) {
  const opt = CALORIE_RANGE_OPTIONS.find(o => o.value === cal);
  return opt ? { min: opt.min, max: opt.max } : { min: cal, max: cal + 99 };
}

function getRangeOpt(cal: number) {
  return CALORIE_RANGE_OPTIONS.find(o => o.value === cal);
}

export default function Home() {
  const router  = useRouter();
  const [selectedMeals, setSelectedMeals]       = useState<number>(4);
  const [goalValues, setGoalValues]              = useState({ calories: "", protein: "", carbs: "", fats: "" });
  const [slotCalories, setSlotCalories]          = useState<Record<string, number>>(DEFAULT_SLOT_CALORIES);
  const [slotMacros, setSlotMacros]              = useState<Record<string, SlotMacro>>({});
  const [loading, setLoading]                    = useState(false);
  const [quickLoading, setQuickLoading]          = useState(false);
  const [error, setError]                        = useState("");
  const [settingsReady, setSettingsReady]        = useState(false);

  useEffect(() => {
    const s = loadSettings();
    if (s) {
      if (s.selectedMeals)    setSelectedMeals(s.selectedMeals);
      if (s.goalValues)       setGoalValues(s.goalValues);
      if (s.slotCalories)     setSlotCalories(s.slotCalories);
      if (s.slotMacros)       setSlotMacros(s.slotMacros);
    }
    setSettingsReady(true);
  }, []);

  useEffect(() => {
    if (!settingsReady) return;
    saveSettings({ selectedMeals, goalValues, slotCalories, slotMacros });
  }, [selectedMeals, goalValues, slotCalories, slotMacros, settingsReady]);

  function getSlotMacro(slot: string): SlotMacro {
    return slotMacros[slot] ?? DEFAULT_MACRO;
  }
  function setSlotMacroField(slot: string, field: keyof SlotMacro, value: string) {
    setSlotMacros((prev) => ({ ...prev, [slot]: { ...getSlotMacro(slot), [field]: value } }));
  }

  const structure   = MEAL_STRUCTURES[selectedMeals];
  const calorieGoal = Number(goalValues.calories) || 0;

  // ── Slot total (use midpoint of each selected range) ───────────────────────
  const slotTotal = structure.reduce((s, sl) => {
    const opt = getRangeOpt(slotCalories[sl.slot] ?? 201);
    return s + (opt ? Math.round((opt.min + opt.max) / 2) : 0);
  }, 0);
  const slotRemaining = calorieGoal - slotTotal;
  const slotOver      = calorieGoal > 0 && slotTotal > calorieGoal;
  const slotPct       = calorieGoal > 0 ? Math.min(100, Math.round((slotTotal / calorieGoal) * 100)) : 0;

  // ── Macro calories ──────────────────────────────────────────────────────────
  const protein      = Number(goalValues.protein) || 0;
  const carbs        = Number(goalValues.carbs)   || 0;
  const fats         = Number(goalValues.fats)    || 0;
  const macroCal     = protein * 4 + carbs * 4 + fats * 9;
  const macroOver    = calorieGoal > 0 && macroCal > 0 && macroCal > calorieGoal * 1.15;
  const macroUnder   = calorieGoal > 0 && macroCal > 0 && macroCal < calorieGoal * 0.85;

  const excessMacroCal = macroCal - calorieGoal;

  // Per-macro kcal contribution
  const proteinKcal = protein * 4;
  const carbsKcal   = carbs * 4;
  const fatsKcal    = fats * 9;


  // ── Slot macro totals vs daily goals ───────────────────────────────────────
  const slotProteinMin = structure.reduce((s, sl) => s + Number(getSlotMacro(sl.slot).proteinMin || 0), 0);
  const slotProteinMax = structure.reduce((s, sl) => s + Number(getSlotMacro(sl.slot).proteinMax || 0), 0);
  const slotCarbMin    = structure.reduce((s, sl) => s + Number(getSlotMacro(sl.slot).carbMin    || 0), 0);
  const slotCarbMax    = structure.reduce((s, sl) => s + Number(getSlotMacro(sl.slot).carbMax    || 0), 0);
  const slotFatMin     = structure.reduce((s, sl) => s + Number(getSlotMacro(sl.slot).fatMin     || 0), 0);
  const slotFatMax     = structure.reduce((s, sl) => s + Number(getSlotMacro(sl.slot).fatMax     || 0), 0);

  // ── Slot calorie button handler ─────────────────────────────────────────────
  function selectSlotCalorie(slot: string, value: number) {
    const currentOpt = getRangeOpt(slotCalories[slot] ?? 201);
    const currentMid = currentOpt ? Math.round((currentOpt.min + currentOpt.max) / 2) : 0;
    const newOpt     = getRangeOpt(value);
    const newMid     = newOpt ? Math.round((newOpt.min + newOpt.max) / 2) : value;
    const newTotal   = slotTotal - currentMid + newMid;

    setSlotCalories(prev => ({ ...prev, [slot]: value }));

    if (calorieGoal > 0 && newTotal > calorieGoal) {
      const over = newTotal - calorieGoal;
      toast.warning(`⚠️ Attenzione: hai superato l'obiettivo di ${over} kcal. Puoi comunque continuare.`);
    }
  }

  // ── Generate ────────────────────────────────────────────────────────────────
  async function handleGenerate(quickMealsOnly = false) {
    setError("");
    const user = getCurrentUser();
    if (!user) { router.push("/auth/login"); return; }

    if (!goalValues.calories || calorieGoal <= 0) {
      const msg = "Inserisci l'obiettivo calorico giornaliero.";
      setError(msg); toast.error(msg); return;
    }

    // Warn if slot total exceeds goal (but don't block)
    if (slotOver) {
      toast.warning(`⚠️ La somma delle calorie per pasto (${slotTotal} kcal) supera l'obiettivo di ${slotTotal - calorieGoal} kcal. Generazione in corso comunque.`);
    }

    // Warn if macros are too far off (but don't block)
    if (macroOver) {
      toast.warning(`⚠️ I macronutrienti forniscono ${macroCal} kcal, superiori all'obiettivo di ${calorieGoal} kcal. Generazione in corso comunque.`);
    }

    const slotCalorieRanges = structure.map((s) => toRange(slotCalories[s.slot] ?? 201));
    // slotCalories = midpoint per slot (backward compat with old remote backend)
    const slotCaloriesArr = slotCalorieRanges.map(r => Math.round((r.min + r.max) / 2));

    const slotProteinRanges = structure.map((s) => {
      const m = getSlotMacro(s.slot);
      return { min: m.proteinMin !== "" ? Number(m.proteinMin) : 0, max: m.proteinMax !== "" ? Number(m.proteinMax) : 9999 };
    });
    const slotCarbRanges = structure.map((s) => {
      const m = getSlotMacro(s.slot);
      return { min: m.carbMin !== "" ? Number(m.carbMin) : 0, max: m.carbMax !== "" ? Number(m.carbMax) : 9999 };
    });
    const slotFatRanges = structure.map((s) => {
      const m = getSlotMacro(s.slot);
      return { min: m.fatMin !== "" ? Number(m.fatMin) : 0, max: m.fatMax !== "" ? Number(m.fatMax) : 9999 };
    });

    if (quickMealsOnly) setQuickLoading(true);
    else setLoading(true);
    try {
      const res = await baseApi.post(ENDPOINTS.mealPlannerGenerate, {
        userId:            user.id,
        mealCount:         selectedMeals as 3 | 4 | 5 | 6,
        calorieGoal,
        proteinGoal:       protein,
        carbohydratesGoal: carbs,
        fatGoal:           fats,
        slotCalories:      slotCaloriesArr,   // remote backend (old)
        slotCalorieRanges,                    // local backend (new)
        slotProteinRanges,
        slotCarbRanges,
        slotFatRanges,
        ...(quickMealsOnly ? { quickMealsOnly: true } : {}),
      });
      const planId = res.data?.data?._id;
      if (planId) {
        toast.success("Piano pasto generato con successo!");
        router.push(`/mealPlans?planId=${planId}`);
      } else {
        const msg = "Piano generato ma ID non trovato.";
        setError(msg); toast.error(msg);
      }
    } catch (err: unknown) {
      const e   = err as { response?: { data?: { message?: string } } };
      const msg = e?.response?.data?.message || "Generazione piano fallita. Riprova.";
      setError(msg); toast.error(msg);
    } finally {
      setLoading(false);
      setQuickLoading(false);
    }
  }

  return (
    <div className="bg-[#f5f4f0] py-10 sm:py-12">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-white shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)]">

          {/* Hero */}
          <div className="relative mx-auto w-full">
            <img src={logo.src} alt="Guida Nutrizionale"
              className="w-full h-37.5 sm:h-87.5 lg:h-125 object-cover object-center" />
          </div>

          <div className="px-6 pb-10 pt-8 sm:px-10">
            <div className="text-center">
              <p className="mt-1 text-2xl lg:text-3xl font-semibold text-[#23422A]">Strategia</p>
              <h2 className="mt-1 text-2xl lg:text-3xl font-semibold text-[#23422A]">Nutrizionale</h2>
            </div>

            {/* ── Daily goals ── */}
            <div className="mt-8">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <FiSettings className="text-[#8F00FF]" />
                <span>Obiettivi nutrizionali giornalieri</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {/* Calorie goal */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500">Calorie (kcal)</label>
                  <div className="group rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 transition-shadow focus-within:border-[#8F00FF] focus-within:shadow-[0_0_0_2px_rgba(143,0,255,0.15)] hover:border-[#8F00FF]">
                    <input
                      type="number" min={0} inputMode="numeric"
                      className="w-full appearance-none bg-transparent text-xl font-semibold text-gray-500 outline-none placeholder:text-sm"
                      placeholder="es. 2000"
                      value={goalValues.calories}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || Number(v) >= 0) setGoalValues(p => ({ ...p, calories: v }));
                      }}
                    />
                  </div>
                </div>

                {/* Protein */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500">Proteine (g)</label>
                  <div className="group rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 transition-shadow focus-within:border-[#8F00FF] focus-within:shadow-[0_0_0_2px_rgba(143,0,255,0.15)] hover:border-[#8F00FF]">
                    <input
                      type="number" min={0} inputMode="numeric"
                      className="w-full appearance-none bg-transparent text-xl font-semibold text-gray-500 outline-none placeholder:text-sm"
                      placeholder="es. 150"
                      value={goalValues.protein}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || Number(v) >= 0) setGoalValues(p => ({ ...p, protein: v }));
                      }}
                    />
                  </div>
                  {protein > 0 && <p className="text-[11px] text-gray-400">{proteinKcal} kcal</p>}
                </div>

                {/* Carbs */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500">Carboidrati (g)</label>
                  <div className="group rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 transition-shadow focus-within:border-[#8F00FF] focus-within:shadow-[0_0_0_2px_rgba(143,0,255,0.15)] hover:border-[#8F00FF]">
                    <input
                      type="number" min={0} inputMode="numeric"
                      className="w-full appearance-none bg-transparent text-xl font-semibold text-gray-500 outline-none placeholder:text-sm"
                      placeholder="es. 200"
                      value={goalValues.carbs}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || Number(v) >= 0) setGoalValues(p => ({ ...p, carbs: v }));
                      }}
                    />
                  </div>
                  {carbs > 0 && <p className="text-[11px] text-gray-400">{carbsKcal} kcal</p>}
                </div>

                {/* Fats */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500">Grassi (g)</label>
                  <div className="group rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 transition-shadow focus-within:border-[#8F00FF] focus-within:shadow-[0_0_0_2px_rgba(143,0,255,0.15)] hover:border-[#8F00FF]">
                    <input
                      type="number" min={0} inputMode="numeric"
                      className="w-full appearance-none bg-transparent text-xl font-semibold text-gray-500 outline-none placeholder:text-sm"
                      placeholder="es. 70"
                      value={goalValues.fats}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || Number(v) >= 0) setGoalValues(p => ({ ...p, fats: v }));
                      }}
                    />
                  </div>
                  {fats > 0 && <p className="text-[11px] text-gray-400">{fatsKcal} kcal</p>}
                </div>
              </div>

              {/* Macro summary — only when all three are filled */}
              {calorieGoal > 0 && macroCal > 0 && (
                <div className={`mt-3 rounded-lg border px-4 py-3 text-sm ${
                  macroOver  ? "border-red-200 bg-red-50 text-red-700" :
                  macroUnder ? "border-amber-200 bg-amber-50 text-amber-700" :
                               "border-green-200 bg-green-50 text-green-700"
                }`}>
                  <div className="font-semibold mb-1">
                    {macroOver  ? "⚠️ Macronutrienti superiori all'obiettivo" :
                     macroUnder ? "ℹ️ Macronutrienti inferiori all'obiettivo" :
                                  "✓ Macronutrienti corretti"}
                  </div>
                  <div className="space-y-0.5 text-xs opacity-80">
                    <div>Proteine {protein}g × 4 = {proteinKcal} kcal</div>
                    <div>Carboidrati {carbs}g × 4 = {carbsKcal} kcal</div>
                    <div>Grassi {fats}g × 9 = {fatsKcal} kcal</div>
                    <div className="font-semibold pt-1 border-t border-current/20 mt-1">
                      Totale: {macroCal} kcal / Obiettivo: {calorieGoal} kcal
                      {macroOver  && ` → troppi +${excessMacroCal} kcal`}
                      {macroUnder && ` → mancano ${calorieGoal - macroCal} kcal`}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Meal frequency ── */}
            <div className="mt-8 rounded-xl border border-gray-100 bg-gray-50 px-5 py-5">
              <div className="text-xs font-semibold text-gray-700">Frequenza dei pasti giornalieri</div>
              <div className="mt-4 flex flex-wrap gap-3">
                {[3, 4, 5, 6].map((m) => (
                  <button key={m} onClick={() => setSelectedMeals(m)}
                    className={`rounded-full px-5 py-2 text-xs font-semibold transition ${
                      selectedMeals === m
                        ? "bg-[#8F00FF] text-white"
                        : "border border-gray-200 bg-white text-gray-600 hover:border-[#8F00FF]"
                    }`}>
                    {m} pasti
                  </button>
                ))}
              </div>
            </div>

            {/* ── Per-slot calorie selectors ── */}
            <div className="mt-8 space-y-4">

              {/* Calorie budget bar */}
              {calorieGoal > 0 && (
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-700 mb-2">
                    <span>Budget calorico pasti</span>
                    <span className={slotOver ? "text-red-600 font-bold" : "text-gray-500"}>
                      {slotTotal} / {calorieGoal} kcal
                      {slotOver && ` (+${slotTotal - calorieGoal} kcal superati)`}
                      {!slotOver && calorieGoal > 0 && ` (rimangono ${slotRemaining} kcal)`}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${slotOver ? "bg-red-500" : slotPct > 85 ? "bg-amber-400" : "bg-[#8F00FF]"}`}
                      style={{ width: `${Math.min(100, slotPct)}%` }}
                    />
                  </div>
                </div>
              )}

              {structure.map((s) => {
                const currentVal = slotCalories[s.slot] ?? 201;
                const currentOpt = getRangeOpt(currentVal);
                const currentMid = currentOpt ? Math.round((currentOpt.min + currentOpt.max) / 2) : 0;
                const macro      = getSlotMacro(s.slot);
                return (
                  <div key={s.slot} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-4 space-y-4">
                    {/* Slot label */}
                    <div className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                      {SLOT_LABEL[s.slot] ?? s.slot}
                    </div>

                    {/* Calorie range (preset buttons) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-gray-600">Range calorie (kcal)</div>
                        {currentOpt && (
                          <span className="text-xs text-[#8F00FF] font-semibold">{currentOpt.label} kcal</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {CALORIE_RANGE_OPTIONS.map((opt) => {
                          const optMid      = Math.round((opt.min + opt.max) / 2);
                          const wouldExceed = calorieGoal > 0 &&
                            (slotTotal - currentMid + optMid) > calorieGoal;
                          const isSelected  = currentVal === opt.value;
                          return (
                            <button
                              key={`${s.slot}-${opt.value}`}
                              onClick={() => selectSlotCalorie(s.slot, opt.value)}
                              title={wouldExceed ? `Supererebbe il budget di ${slotTotal - currentMid + optMid - calorieGoal} kcal` : undefined}
                              className={`rounded-md border px-2 py-2 text-center text-[11px] font-semibold transition ${
                                isSelected
                                  ? "border-[#8F00FF] bg-[#8F00FF]/5 text-[#8F00FF] shadow-[0_0_0_1px_rgba(143,0,255,0.2)]"
                                  : wouldExceed
                                  ? "border-amber-200 bg-amber-50 text-amber-500 hover:border-amber-400"
                                  : "border-gray-200 text-gray-600 hover:border-[#8F00FF]"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Macro ranges (da / a) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Protein */}
                      <div>
                        <div className="mb-1 text-[11px] font-semibold text-gray-600">Range proteine (g)</div>
                        <div className="flex gap-2">
                          <input
                            type="number" min="0" placeholder="Da"
                            value={macro.proteinMin}
                            onChange={(e) => setSlotMacroField(s.slot, "proteinMin", e.target.value)}
                            className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-[13px] font-medium text-gray-800 shadow-sm outline-none focus:border-[#8F00FF] focus:ring-1 focus:ring-[#8F00FF]/20 placeholder:font-semibold placeholder:text-gray-400"
                          />
                          <input
                            type="number" min="0" placeholder="A"
                            value={macro.proteinMax}
                            onChange={(e) => setSlotMacroField(s.slot, "proteinMax", e.target.value)}
                            className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-[13px] font-medium text-gray-800 shadow-sm outline-none focus:border-[#8F00FF] focus:ring-1 focus:ring-[#8F00FF]/20 placeholder:font-semibold placeholder:text-gray-400"
                          />
                        </div>
                      </div>

                      {/* Carbs */}
                      <div>
                        <div className="mb-1 text-[11px] font-semibold text-gray-600">Range carboidrati (g)</div>
                        <div className="flex gap-2">
                          <input
                            type="number" min="0" placeholder="Da"
                            value={macro.carbMin}
                            onChange={(e) => setSlotMacroField(s.slot, "carbMin", e.target.value)}
                            className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-[13px] font-medium text-gray-800 shadow-sm outline-none focus:border-[#8F00FF] focus:ring-1 focus:ring-[#8F00FF]/20 placeholder:font-semibold placeholder:text-gray-400"
                          />
                          <input
                            type="number" min="0" placeholder="A"
                            value={macro.carbMax}
                            onChange={(e) => setSlotMacroField(s.slot, "carbMax", e.target.value)}
                            className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-[13px] font-medium text-gray-800 shadow-sm outline-none focus:border-[#8F00FF] focus:ring-1 focus:ring-[#8F00FF]/20 placeholder:font-semibold placeholder:text-gray-400"
                          />
                        </div>
                      </div>

                      {/* Fat */}
                      <div>
                        <div className="mb-1 text-[11px] font-semibold text-gray-600">Range grassi (g)</div>
                        <div className="flex gap-2">
                          <input
                            type="number" min="0" placeholder="Da"
                            value={macro.fatMin}
                            onChange={(e) => setSlotMacroField(s.slot, "fatMin", e.target.value)}
                            className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-[13px] font-medium text-gray-800 shadow-sm outline-none focus:border-[#8F00FF] focus:ring-1 focus:ring-[#8F00FF]/20 placeholder:font-semibold placeholder:text-gray-400"
                          />
                          <input
                            type="number" min="0" placeholder="A"
                            value={macro.fatMax}
                            onChange={(e) => setSlotMacroField(s.slot, "fatMax", e.target.value)}
                            className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-[13px] font-medium text-gray-800 shadow-sm outline-none focus:border-[#8F00FF] focus:ring-1 focus:ring-[#8F00FF]/20 placeholder:font-semibold placeholder:text-gray-400"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Macro slot summary vs daily goals ── */}
            {(protein > 0 || carbs > 0 || fats > 0) && (slotProteinMin > 0 || slotProteinMax > 0 || slotCarbMin > 0 || slotCarbMax > 0 || slotFatMin > 0 || slotFatMax > 0) && (() => {
              const rows = [
                { label: "Proteine",    goal: protein, min: slotProteinMin, max: slotProteinMax, show: protein > 0 && (slotProteinMin > 0 || slotProteinMax > 0) },
                { label: "Carboidrati", goal: carbs,   min: slotCarbMin,    max: slotCarbMax,    show: carbs > 0   && (slotCarbMin > 0   || slotCarbMax > 0)   },
                { label: "Grassi",      goal: fats,    min: slotFatMin,     max: slotFatMax,     show: fats > 0    && (slotFatMin > 0    || slotFatMax > 0)    },
              ].filter(r => r.show);

              return (
                <div className="mt-6 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                  <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                    <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Macro allocati vs obiettivo giornaliero</p>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {rows.map(({ label, goal, min, max }) => {
                      const isOver  = max > 0 && max > goal;
                      const isOk    = max > 0 && max <= goal && min <= goal;
                      const diff    = isOver ? max - goal : goal - max;
                      const remainMin = goal - min;

                      return (
                        <div key={label} className="grid grid-cols-[120px_1fr_auto] items-center gap-4 px-4 py-3">
                          {/* Label */}
                          <span className="text-sm font-bold text-gray-800">{label}</span>

                          {/* Progress info */}
                          <div>
                            <div className="flex items-center gap-1 text-sm font-semibold text-gray-800">
                              <span>{min}</span>
                              <span className="text-gray-400">–</span>
                              <span>{max}</span>
                              <span className="text-gray-500 font-normal">g</span>
                              <span className="mx-1 text-gray-300">/</span>
                              <span className="text-[#8F00FF]">{goal} g</span>
                            </div>
                            {/* Bar */}
                            <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full transition-all ${isOver ? "bg-red-500" : "bg-[#8F00FF]"}`}
                                style={{ width: `${Math.min(100, goal > 0 ? Math.round((max / goal) * 100) : 0)}%` }}
                              />
                            </div>
                          </div>

                          {/* Status badge */}
                          <div className="text-right min-w-[110px]">
                            {isOver && (
                              <span className="inline-block rounded-md bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                                ⚠ +{diff} g in più
                              </span>
                            )}
                            {!isOver && isOk && remainMin > 0 && (
                              <span className="inline-block rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">
                                {remainMin} g baki
                              </span>
                            )}
                            {!isOver && isOk && remainMin <= 0 && (
                              <span className="inline-block rounded-md bg-green-100 px-2 py-1 text-xs font-bold text-green-700">
                                ✓ Goal pura
                              </span>
                            )}
                            {!isOver && !isOk && max === 0 && (
                              <span className="text-[11px] text-gray-400">—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
                {error}
              </div>
            )}

            {/* CTA */}
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => handleGenerate(false)}
                disabled={loading || quickLoading}
                className="rounded-lg bg-[#8F00FF] px-10 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#7A00E5] disabled:opacity-60 transition"
              >
                {loading ? "Generazione in corso..." : "VEDI PIANO PASTO →"}
              </button>
              <button
                onClick={() => handleGenerate(true)}
                disabled={loading || quickLoading}
                className="rounded-lg border border-[#8F00FF] bg-white px-8 py-3 text-sm font-semibold text-[#8F00FF] hover:bg-[#8F00FF]/5 disabled:opacity-60 transition"
              >
                {quickLoading ? "Generazione in corso..." : "PASTI PRATICI E VELOCI"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
