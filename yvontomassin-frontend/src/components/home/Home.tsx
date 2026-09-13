"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import logo from "../../assets/hero.svg";
import baseApi from "@/src/api/baseApi";
import { ENDPOINTS } from "@/src/api/endPoints";
import { getCurrentUser } from "@/src/lib/authService";
import { toast } from "sonner";

const MEAL_STRUCTURES: Record<number, { slot: string; category: string }[]> = {
  3: [
    { slot: "Breakfast", category: "Breakfast" },
    { slot: "Lunch", category: "Lunch" },
    { slot: "Dinner", category: "Dinner" },
  ],
  4: [
    { slot: "Breakfast", category: "Breakfast" },
    { slot: "Snack", category: "Snack" },
    { slot: "Lunch", category: "Lunch" },
    { slot: "Dinner", category: "Dinner" },
  ],
  5: [
    { slot: "Breakfast", category: "Breakfast" },
    { slot: "Snack", category: "Snack" },
    { slot: "Lunch", category: "Lunch" },
    { slot: "Snack 2", category: "Snack" },
    { slot: "Dinner", category: "Dinner" },
  ],
  6: [
    { slot: "Breakfast", category: "Breakfast" },
    { slot: "Snack", category: "Snack" },
    { slot: "Lunch", category: "Lunch" },
    { slot: "Snack 2", category: "Snack" },
    { slot: "Dinner", category: "Dinner" },
    { slot: "Snack 3", category: "Snack" },
  ],
};

const SLOT_LABEL: Record<string, string> = {
  Breakfast: "Colazione",
  Snack: "Merenda",
  "Snack 2": "Merenda 2",
  "Snack 3": "Merenda 3",
  Lunch: "Pranzo",
  Dinner: "Cena",
};

type PortionSize = "Small" | "Medium" | "Large";
type Band = { min: number; max: number; mealCount?: number };
type FilterTable = Record<string, Record<PortionSize, Band>>;

const PORTIONS: { key: PortionSize; label: string }[] = [
  { key: "Small", label: "Piccola" },
  { key: "Medium", label: "Media" },
  { key: "Large", label: "Grande" },
];

const DEFAULT_PORTIONS: Record<string, PortionSize> = {
  Breakfast: "Medium",
  Snack: "Medium",
  "Snack 2": "Medium",
  "Snack 3": "Medium",
  Lunch: "Medium",
  Dinner: "Medium",
};

const STORAGE_KEY = "homeSettings_v4";

function loadSettings() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
}
function saveSettings(data: object) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function Home() {
  const router = useRouter();
  const [selectedMeals, setSelectedMeals] = useState<number>(4);
  const [slotPortions, setSlotPortions] = useState<Record<string, PortionSize>>(DEFAULT_PORTIONS);
  const [filters, setFilters] = useState<FilterTable | null>(null);
  const [loading, setLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState(false);
  const [error, setError] = useState("");
  const [settingsReady, setSettingsReady] = useState(false);

  useEffect(() => {
    const s = loadSettings();
    if (s) {
      if (s.selectedMeals) setSelectedMeals(s.selectedMeals);
      if (s.slotPortions) setSlotPortions({ ...DEFAULT_PORTIONS, ...s.slotPortions });
    }
    setSettingsReady(true);
  }, []);

  useEffect(() => {
    if (!settingsReady) return;
    saveSettings({ selectedMeals, slotPortions });
  }, [selectedMeals, slotPortions, settingsReady]);

  useEffect(() => {
    baseApi.get(ENDPOINTS.portionFilters)
      .then((res) => { if (res.data?.data) setFilters(res.data.data); })
      .catch(() => { /* generate still works with backend defaults */ });
  }, []);

  const structure = MEAL_STRUCTURES[selectedMeals];

  function getBand(category: string, size: PortionSize): Band | null {
    return filters?.[category]?.[size] ?? null;
  }

  const estimatedTotal = structure.reduce((sum, sl) => {
    const size = slotPortions[sl.slot] ?? "Medium";
    const band = getBand(sl.category, size);
    if (!band) return sum;
    return sum + Math.round((band.min + band.max) / 2);
  }, 0);

  async function handleGenerate(quickMealsOnly = false) {
    setError("");
    const user = getCurrentUser();
    if (!user) { router.push("/auth/login"); return; }

    const portions = structure.map((s) => slotPortions[s.slot] ?? "Medium");

    if (quickMealsOnly) setQuickLoading(true);
    else setLoading(true);
    try {
      const res = await baseApi.post(ENDPOINTS.mealPlannerGenerate, {
        userId: user.id,
        mealCount: selectedMeals as 3 | 4 | 5 | 6,
        slotPortions: portions,
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
      const e = err as { response?: { data?: { message?: string } } };
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
          <div className="relative mx-auto w-full">
            <img
              src={logo.src}
              alt="Guida Nutrizionale"
              className="h-37.5 w-full object-cover object-center sm:h-87.5 lg:h-125"
            />
          </div>

          <div className="px-6 pb-10 pt-8 sm:px-10">
            <div className="text-center">
              <p className="mt-1 text-2xl font-semibold text-[#23422A] lg:text-3xl">Strategia</p>
              <h2 className="mt-1 text-2xl font-semibold text-[#23422A] lg:text-3xl">Nutrizionale</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-gray-500">
                Scegli quanti pasti e la porzione di ciascuno. Piccola, media o grande: il resto lo fa il piano.
              </p>
            </div>

            <div className="mt-10 rounded-2xl border border-gray-100 bg-[#faf9f6] px-5 py-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Quanti pasti oggi?
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {[3, 4, 5, 6].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMeals(m)}
                    className={`rounded-full px-6 py-2.5 text-sm font-semibold transition ${
                      selectedMeals === m
                        ? "bg-[#8F00FF] text-white shadow-sm"
                        : "border border-gray-200 bg-white text-gray-600 hover:border-[#8F00FF]"
                    }`}
                  >
                    {m} pasti
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {structure.map((s) => {
                const selected = slotPortions[s.slot] ?? "Medium";
                return (
                  <div
                    key={s.slot}
                    className="rounded-2xl border border-gray-100 bg-[#faf9f6] p-5"
                  >
                    <div className="text-sm font-bold uppercase tracking-wide text-gray-800">
                      {SLOT_LABEL[s.slot] ?? s.slot}
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {PORTIONS.map((p) => {
                        const band = getBand(s.category, p.key);
                        const active = selected === p.key;
                        const empty = (band?.mealCount ?? 1) === 0;
                        return (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() =>
                              setSlotPortions((prev) => ({ ...prev, [s.slot]: p.key }))
                            }
                            className={`rounded-xl border px-2 py-3 text-center transition ${
                              active
                                ? "border-[#8F00FF] bg-[#8F00FF] text-white shadow-sm"
                                : "border-gray-200 bg-white text-gray-700 hover:border-[#8F00FF]"
                            }`}
                          >
                            <div className="text-sm font-semibold">{p.label}</div>
                            {band && (
                              <div className={`mt-1 text-[10px] ${active ? "text-white/80" : "text-gray-400"}`}>
                                {band.min}–{band.max} kcal
                              </div>
                            )}
                            {empty && (
                              <div className={`mt-1 text-[10px] font-semibold ${active ? "text-amber-100" : "text-amber-600"}`}>
                                Nessun pasto
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {estimatedTotal > 0 && (
              <p className="mt-6 text-center text-sm text-gray-500">
                Totale indicativo:{" "}
                <span className="font-semibold text-[#8F00FF]">~{estimatedTotal} kcal</span>
              </p>
            )}

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => handleGenerate(false)}
                disabled={loading || quickLoading}
                className="rounded-lg bg-[#8F00FF] px-10 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#7A00E5] disabled:opacity-60"
              >
                {loading ? "Generazione in corso..." : "VEDI PIANO PASTO →"}
              </button>
              <button
                onClick={() => handleGenerate(true)}
                disabled={loading || quickLoading}
                className="rounded-lg border border-[#8F00FF] bg-white px-8 py-3 text-sm font-semibold text-[#8F00FF] transition hover:bg-[#8F00FF]/5 disabled:opacity-60"
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
