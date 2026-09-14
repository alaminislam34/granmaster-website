"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FiSave } from "react-icons/fi";
import { toast } from "sonner";
import baseApi from "@/src/api/baseApi";
import { ENDPOINTS } from "@/src/api/endPoints";

type Band = { min: number; max: number; mealCount?: number };
type Size = "Small" | "Medium" | "Large";
type Category = "Breakfast" | "Snack" | "Lunch" | "Dinner";
type Table = Record<Category, Record<Size, Band>>;

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "Breakfast", label: "Colazione" },
  { key: "Snack", label: "Merenda" },
  { key: "Lunch", label: "Pranzo" },
  { key: "Dinner", label: "Cena" },
];

const SIZES: { key: Size; label: string }[] = [
  { key: "Small", label: "Piccola" },
  { key: "Medium", label: "Media" },
  { key: "Large", label: "Grande" },
];

const EMPTY: Table = {
  Breakfast: { Small: { min: 100, max: 300 }, Medium: { min: 301, max: 450 }, Large: { min: 451, max: 600 } },
  Snack: { Small: { min: 100, max: 200 }, Medium: { min: 201, max: 350 }, Large: { min: 351, max: 500 } },
  Lunch: { Small: { min: 200, max: 400 }, Medium: { min: 401, max: 600 }, Large: { min: 601, max: 900 } },
  Dinner: { Small: { min: 200, max: 400 }, Medium: { min: 401, max: 600 }, Large: { min: 601, max: 900 } },
};

function normalizeTable(data: unknown): Table {
  const src = (data ?? {}) as Partial<Table>;
  const next: Table = {
    Breakfast: { ...EMPTY.Breakfast },
    Snack: { ...EMPTY.Snack },
    Lunch: { ...EMPTY.Lunch },
    Dinner: { ...EMPTY.Dinner },
  };

  for (const { key } of CATEGORIES) {
    next[key] = { ...EMPTY[key] };
    for (const { key: size } of SIZES) {
      const band = src[key]?.[size];
      const min = Number(band?.min);
      const max = Number(band?.max);
      next[key][size] = {
        min: Number.isFinite(min) ? min : EMPTY[key][size].min,
        max: Number.isFinite(max) ? max : EMPTY[key][size].max,
        mealCount: Number.isFinite(Number(band?.mealCount)) ? Number(band?.mealCount) : 0,
      };
    }
  }

  return next;
}

export default function PortionFilters() {
  const [table, setTable] = useState<Table>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchTable = useCallback(async () => {
    setLoading(true);
    try {
      const res = await baseApi.get(ENDPOINTS.portionFilters);
      if (res.data?.data) setTable(normalizeTable(res.data.data));
    } catch {
      toast.error("Impossibile caricare i filtri porzione.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTable(); }, [fetchTable]);

  function setBand(category: Category, size: Size, field: "min" | "max", value: string) {
    const num = Number(value);
    setTable((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [size]: { ...prev[category][size], [field]: Number.isFinite(num) ? num : 0 },
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        table: Object.fromEntries(
          CATEGORIES.map(({ key }) => [
            key,
            Object.fromEntries(
              SIZES.map(({ key: size }) => [
                size,
                { min: Number(table[key][size].min), max: Number(table[key][size].max) },
              ])
            ),
          ])
        ),
      };
      const res = await baseApi.put(ENDPOINTS.portionFilters, payload);
      if (res.data?.data) setTable(normalizeTable(res.data.data));
      toast.success("Filtri porzione salvati.");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Salvataggio fallito.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Filtri porzione</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          L’utente sceglie solo Piccola, Media o Grande. Qui decidi quante calorie corrisponde ogni misura.
          Il numero in viola indica quanti pasti del catalogo cadono in quel range.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[140px_1fr_1fr_1fr] gap-0 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <span>Pasto</span>
          {SIZES.map((s) => (
            <span key={s.key} className="text-center">{s.label}</span>
          ))}
        </div>

        {loading ? (
          <div className="px-4 py-12 text-center text-sm text-slate-400">Caricamento...</div>
        ) : (
          CATEGORIES.map(({ key, label }, idx) => (
            <div
              key={key}
              className={`grid grid-cols-[140px_1fr_1fr_1fr] items-center gap-3 px-4 py-4 ${
                idx < CATEGORIES.length - 1 ? "border-b border-slate-100" : ""
              }`}
            >
              <div className="text-sm font-semibold text-slate-800">{label}</div>
              {SIZES.map((s) => {
                const band = table[key][s.key];
                const empty = (band.mealCount ?? 0) === 0;
                return (
                  <div key={s.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500">{s.label}</span>
                      <span className={`text-[11px] font-bold ${empty ? "text-amber-600" : "text-[#8F00FF]"}`}>
                        {band.mealCount ?? 0} pasti
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={Number.isFinite(band.min) ? band.min : ""}
                        onChange={(e) => setBand(key, s.key, "min", e.target.value)}
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-semibold text-slate-800 outline-none focus:border-[#8F00FF]"
                      />
                      <span className="text-xs text-slate-400">–</span>
                      <input
                        type="number"
                        min={0}
                        value={Number.isFinite(band.max) ? band.max : ""}
                        onChange={(e) => setBand(key, s.key, "max", e.target.value)}
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-semibold text-slate-800 outline-none focus:border-[#8F00FF]"
                      />
                    </div>
                    <p className="mt-1.5 text-center text-[10px] text-slate-400">kcal</p>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 rounded-xl bg-[#8F00FF] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#7A00E5] disabled:opacity-60"
        >
          <FiSave />
          {saving ? "Salvataggio..." : "Salva filtri"}
        </button>
      </div>
    </div>
  );
}
