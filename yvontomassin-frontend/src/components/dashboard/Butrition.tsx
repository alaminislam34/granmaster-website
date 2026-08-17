"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FiChevronDown, FiChevronLeft, FiChevronRight,
  FiEdit2, FiFilter, FiPlus, FiTrash2, FiUploadCloud, FiX,
} from "react-icons/fi";
import {
  PiBowlFoodBold, PiForkKnifeBold, PiLightningBold, PiWarningDiamondBold,
} from "react-icons/pi";
import baseApi from "@/src/api/baseApi";
import { ENDPOINTS } from "@/src/api/endPoints";
import { toast } from "sonner";
import { getImageUrl } from "@/src/lib/imageUrl";

// ─── Types ────────────────────────────────────────────────────────────────────
type MealCategory = "Breakfast" | "Lunch" | "Dinner" | "Snack" ;
type PortionType = "Small" | "Medium" | "Large";

interface NutritionInfo { calories: number; protein: number; carbohydrates: number; fat: number; }
interface Meal {
  _id: string; name: string; category: MealCategory;
  portionSize: number; portionType?: PortionType; image?: string; nutrition: NutritionInfo;
  description?: string;
  createdAt: string;
}

// Italian UI label → English backend enum
const CATEGORY_MAP: Record<string, MealCategory> = {
  Colazione: "Breakfast", Pranzo: "Lunch", Cena: "Dinner",
  Spuntino: "Snack",
};
const CATEGORY_LABELS = Object.keys(CATEGORY_MAP);
const FILTER_TABS = ["Tutti", ...CATEGORY_LABELS];

const BADGE: Record<MealCategory, string> = {
  Breakfast: "bg-[#8F00FF]/10 text-[#8F00FF]",
  Lunch:     "bg-[#8F00FF]/5 text-[#8F00FF]",
  Snack:     "bg-[#8F00FF]/70 text-white",
  Dinner:    "bg-slate-200 text-slate-700",
};
const BADGE_LABEL: Record<MealCategory, string> = {
  Breakfast: "Colazione", Lunch: "Pranzo", Snack: "Spuntino",
  Dinner: "Cena",
};

// ─── Empty form state ─────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: "", category: "Colazione", portionSize: "",
  portionType: "Medium" as PortionType,
  calories: "", protein: "", carbohydrates: "", fat: "",
  description: "",
};

const PAGE_SIZE = 8;

export default function Butrition() {
  const [meals, setMeals]           = useState<Meal[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [activeTab, setActiveTab]   = useState("Tutti");
  const [page, setPage]             = useState(1);

  // Modal state
  const [modalOpen, setModalOpen]   = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [imageFile, setImageFile]   = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState("");
  const fileInputRef                = useRef<HTMLInputElement>(null);

  // ─── Fetch all ─────────────────────────────────────────────────────────────
  const fetchMeals = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await baseApi.get(ENDPOINTS.nutrition);
      setMeals(res.data?.data ?? []);
    } catch {
      setError("Impossibile caricare i pasti.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMeals(); }, [fetchMeals]);

  // ─── ESC close ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!modalOpen) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [modalOpen]);

  // ─── Modal helpers ─────────────────────────────────────────────────────────
  function openCreate() {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setImageFile(null);
    setImagePreview("");
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(meal: Meal) {
    setEditId(meal._id);
    setForm({
      name: meal.name,
      category: BADGE_LABEL[meal.category] || "Colazione",
      portionSize: String(meal.portionSize),
      portionType: meal.portionType ?? "Medium",
      calories: String(meal.nutrition.calories),
      protein: String(meal.nutrition.protein),
      carbohydrates: String(meal.nutrition.carbohydrates),
      fat: String(meal.nutrition.fat),
      description: meal.description ?? "",
    });
    setImageFile(null);
    setImagePreview(getImageUrl(meal.image) ?? "");
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  // ─── Save (create or update) ───────────────────────────────────────────────
  async function handleSave() {
    setFormError("");
    if (!form.name.trim()) { setFormError("Il nome è obbligatorio"); return; }
    if (!form.description.trim()) { setFormError("La descrizione del pasto è obbligatoria"); return; }
    if (!form.portionSize || Number(form.portionSize) < 1) { setFormError("La porzione deve essere ≥ 1 g"); return; }
    if (!form.calories) { setFormError("Le calorie sono obbligatorie"); return; }

    const p = Number(form.protein) || 0;
    const c = Number(form.carbohydrates) || 0;
    const f = Number(form.fat) || 0;
    const calcCal = p * 4 + c * 4 + f * 9;
    const enteredCal = Number(form.calories);
    if (calcCal > 0 && Math.abs(enteredCal - calcCal) > enteredCal * 0.1) {
      setFormError(`Le calorie inserite (${enteredCal} kcal) non corrispondono al totale dei macro (${calcCal} kcal). Correggi i valori.`);
      return;
    }

    const bodyCategory = CATEGORY_MAP[form.category] ?? "Breakfast";

    const fd = new FormData();
    if (imageFile) fd.append("image", imageFile);
    fd.append("data", JSON.stringify({
      name: form.name.trim(),
      category: bodyCategory,
      portionSize: Number(form.portionSize),
      portionType: form.portionType,
      description: form.description.trim() || undefined,
      nutrition: {
        calories: Number(form.calories),
        protein: Number(form.protein) || 0,
        carbohydrates: Number(form.carbohydrates) || 0,
        fat: Number(form.fat) || 0,
      },
    }));

    setSaving(true);
    try {
      if (editId) {
        await baseApi.patch(`${ENDPOINTS.nutrition}/${editId}`, fd);
        toast.success("Pasto aggiornato!");
      } else {
        await baseApi.post(ENDPOINTS.nutritionCreate, fd);
        toast.success("Pasto pubblicato!");
      }
      closeModal();
      fetchMeals();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      const msg = e?.response?.data?.message || "Salvataggio fallito.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo pasto?")) return;
    try {
      await baseApi.delete(`${ENDPOINTS.nutrition}/${id}`);
      setMeals((prev) => prev.filter((m) => m._id !== id));
      toast.success("Pasto eliminato.");
    } catch {
      toast.error("Eliminazione fallita.");
    }
  }

  // ─── Advanced filter state ─────────────────────────────────────────────────
  const [filterOpen, setFilterOpen]           = useState(false);
  const [portionFilter, setPortionFilter]     = useState<PortionType[]>([]);
  const [calFilter, setCalFilter]             = useState({ min: "", max: "" });
  const [proteinFilter, setProteinFilter]     = useState({ min: "", max: "" });
  const [carbFilter, setCarbFilter]           = useState({ min: "", max: "" });
  const [fatFilter, setFatFilter]             = useState({ min: "", max: "" });

  function togglePortionFilter(pt: PortionType) {
    setPortionFilter((prev) =>
      prev.includes(pt) ? prev.filter((p) => p !== pt) : [...prev, pt]
    );
    setPage(1);
  }

  function clearFilters() {
    setPortionFilter([]); setCalFilter({ min: "", max: "" });
    setProteinFilter({ min: "", max: "" }); setCarbFilter({ min: "", max: "" });
    setFatFilter({ min: "", max: "" }); setPage(1);
  }

  const activeFilterCount =
    portionFilter.length +
    (calFilter.min || calFilter.max ? 1 : 0) +
    (proteinFilter.min || proteinFilter.max ? 1 : 0) +
    (carbFilter.min || carbFilter.max ? 1 : 0) +
    (fatFilter.min || fatFilter.max ? 1 : 0);

  // ─── Filtering & pagination ────────────────────────────────────────────────
  const filtered = meals.filter((m) => {
    if (activeTab !== "Tutti") {
      const target = CATEGORY_MAP[activeTab];
      if (target === undefined || m.category !== target) return false;
    }
    if (portionFilter.length > 0 && (!m.portionType || !portionFilter.includes(m.portionType))) return false;
    if (calFilter.min !== "" && m.nutrition.calories < Number(calFilter.min)) return false;
    if (calFilter.max !== "" && m.nutrition.calories > Number(calFilter.max)) return false;
    if (proteinFilter.min !== "" && m.nutrition.protein < Number(proteinFilter.min)) return false;
    if (proteinFilter.max !== "" && m.nutrition.protein > Number(proteinFilter.max)) return false;
    if (carbFilter.min !== "" && m.nutrition.carbohydrates < Number(carbFilter.min)) return false;
    if (carbFilter.max !== "" && m.nutrition.carbohydrates > Number(carbFilter.max)) return false;
    if (fatFilter.min !== "" && m.nutrition.fat < Number(fatFilter.min)) return false;
    if (fatFilter.max !== "" && m.nutrition.fat > Number(fatFilter.max)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function changeTab(tab: string) { setActiveTab(tab); setPage(1); }

  // ─── Stats ────────────────────────────────────────────────────────────────
  const avgCal = meals.length
    ? Math.round(meals.reduce((s, m) => s + m.nutrition.calories, 0) / meals.length)
    : 0;
  const uniqueCats = new Set(meals.map((m) => m.category)).size;

  const stats = [
    { label: "PASTI TOTALI", value: String(meals.length), icon: PiForkKnifeBold, accent: "bg-[#8F00FF]/10 text-[#8F00FF]" },
    { label: "PIANI ATTIVI", value: String(filtered.length), icon: PiBowlFoodBold, accent: "bg-[#8F00FF]/5 text-[#8F00FF]" },
    { label: "CATEGORIE", value: String(uniqueCats), icon: PiWarningDiamondBold, accent: "bg-emerald-100/70 text-emerald-800" },
    { label: "AVG. NUTRIENTI", value: String(avgCal), suffix: "kcal", icon: PiLightningBold, accent: "bg-[#8F00FF]/5 text-[#8F00FF]" },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="mx-auto w-full space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[30px] leading-none font-semibold tracking-[-0.02em] text-slate-900 sm:text-[34px] md:text-[38px]">
            Pasti
          </h1>
          <button
            onClick={openCreate}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#8F00FF] px-3 text-[12px] font-semibold whitespace-nowrap text-white shadow-[0_8px_22px_-12px_rgba(143,0,255,0.8)] transition hover:bg-[#7A00E5] sm:h-11 sm:px-5 sm:text-[13px]"
          >
            <FiPlus className="text-sm" /> Aggiungi nuovo pasto
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500">{item.label}</p>
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${item.accent}`}>
                    <Icon className="text-base" />
                  </span>
                </div>
                <p className="mt-1 text-[30px] leading-none font-semibold text-slate-900">
                  {item.value}
                  {item.suffix && <span className="ml-1 text-[16px] text-slate-500">{item.suffix}</span>}
                </p>
              </div>
            );
          })}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Tabs + Filter toggle */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-3 text-[11px] font-semibold text-slate-500 sm:px-4">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => changeTab(tab)}
                className={`rounded-full px-3 py-1 transition ${activeTab === tab ? "bg-[#8F00FF]/10 text-[#8F00FF]" : "hover:bg-slate-100"}`}
              >
                {tab}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-[10px] text-red-500 hover:underline">
                  Reset ({activeFilterCount})
                </button>
              )}
              <button
                onClick={() => setFilterOpen((o) => !o)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 transition ${filterOpen || activeFilterCount > 0 ? "border-[#8F00FF] bg-[#8F00FF]/5 text-[#8F00FF]" : "border-slate-200 hover:border-[#8F00FF] hover:text-[#8F00FF]"}`}
              >
                <FiFilter className="text-xs" />
                Filtri
                {activeFilterCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#8F00FF] text-[9px] text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Advanced filter panel */}
          {filterOpen && (
            <div className="border-b border-slate-200 bg-slate-50/60 px-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                {/* 1. Tipo porzione */}
                <div>
                  <p className="mb-2 text-[11px] font-semibold text-slate-600 uppercase tracking-wide">1. Tipo porzione</p>
                  <div className="flex gap-2">
                    {(["Small", "Medium", "Large"] as PortionType[]).map((pt) => (
                      <button
                        key={pt}
                        onClick={() => { togglePortionFilter(pt); setPage(1); }}
                        className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
                          portionFilter.includes(pt)
                            ? "border-[#8F00FF] bg-[#8F00FF]/5 text-[#8F00FF]"
                            : "border-slate-200 text-slate-600 hover:border-[#8F00FF]"
                        }`}
                      >
                        {pt === "Small" ? "Piccola" : pt === "Medium" ? "Media" : "Grande"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Range calorie */}
                <div>
                  <p className="mb-2 text-[11px] font-semibold text-slate-600 uppercase tracking-wide">2. Range calorie (kcal)</p>
                  <div className="flex gap-2">
                    <input
                      type="number" min="0" placeholder="Da"
                      value={calFilter.min}
                      onChange={(e) => { setCalFilter((f) => ({ ...f, min: e.target.value })); setPage(1); }}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-800 shadow-sm outline-none focus:border-[#8F00FF] focus:ring-1 focus:ring-[#8F00FF]/20 placeholder:font-semibold placeholder:text-slate-400"
                    />
                    <input
                      type="number" min="0" placeholder="A"
                      value={calFilter.max}
                      onChange={(e) => { setCalFilter((f) => ({ ...f, max: e.target.value })); setPage(1); }}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-800 shadow-sm outline-none focus:border-[#8F00FF] focus:ring-1 focus:ring-[#8F00FF]/20 placeholder:font-semibold placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* 3. Range proteine */}
                <div>
                  <p className="mb-2 text-[11px] font-semibold text-slate-600 uppercase tracking-wide">3. Range proteine (g)</p>
                  <div className="flex gap-2">
                    <input
                      type="number" min="0" placeholder="Da"
                      value={proteinFilter.min}
                      onChange={(e) => { setProteinFilter((f) => ({ ...f, min: e.target.value })); setPage(1); }}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-800 shadow-sm outline-none focus:border-[#8F00FF] focus:ring-1 focus:ring-[#8F00FF]/20 placeholder:font-semibold placeholder:text-slate-400"
                    />
                    <input
                      type="number" min="0" placeholder="A"
                      value={proteinFilter.max}
                      onChange={(e) => { setProteinFilter((f) => ({ ...f, max: e.target.value })); setPage(1); }}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-800 shadow-sm outline-none focus:border-[#8F00FF] focus:ring-1 focus:ring-[#8F00FF]/20 placeholder:font-semibold placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* 4. Range carboidrati */}
                <div>
                  <p className="mb-2 text-[11px] font-semibold text-slate-600 uppercase tracking-wide">4. Range carboidrati (g)</p>
                  <div className="flex gap-2">
                    <input
                      type="number" min="0" placeholder="Da"
                      value={carbFilter.min}
                      onChange={(e) => { setCarbFilter((f) => ({ ...f, min: e.target.value })); setPage(1); }}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-800 shadow-sm outline-none focus:border-[#8F00FF] focus:ring-1 focus:ring-[#8F00FF]/20 placeholder:font-semibold placeholder:text-slate-400"
                    />
                    <input
                      type="number" min="0" placeholder="A"
                      value={carbFilter.max}
                      onChange={(e) => { setCarbFilter((f) => ({ ...f, max: e.target.value })); setPage(1); }}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-800 shadow-sm outline-none focus:border-[#8F00FF] focus:ring-1 focus:ring-[#8F00FF]/20 placeholder:font-semibold placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* 5. Range grassi */}
                <div>
                  <p className="mb-2 text-[11px] font-semibold text-slate-600 uppercase tracking-wide">5. Range grassi (g)</p>
                  <div className="flex gap-2">
                    <input
                      type="number" min="0" placeholder="Da"
                      value={fatFilter.min}
                      onChange={(e) => { setFatFilter((f) => ({ ...f, min: e.target.value })); setPage(1); }}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-800 shadow-sm outline-none focus:border-[#8F00FF] focus:ring-1 focus:ring-[#8F00FF]/20 placeholder:font-semibold placeholder:text-slate-400"
                    />
                    <input
                      type="number" min="0" placeholder="A"
                      value={fatFilter.max}
                      onChange={(e) => { setFatFilter((f) => ({ ...f, max: e.target.value })); setPage(1); }}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-800 shadow-sm outline-none focus:border-[#8F00FF] focus:ring-1 focus:ring-[#8F00FF]/20 placeholder:font-semibold placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* 6. Categoria pasto — info only (already handled by tabs) */}
                <div>
                  <p className="mb-2 text-[11px] font-semibold text-slate-600 uppercase tracking-wide">6. Categoria pasto</p>
                  <p className="text-[11px] text-slate-400">Usa le schede in alto per filtrare per categoria (Colazione, Pranzo, Cena, Spuntino).</p>
                </div>

              </div>

              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-700"
                >
                  <FiX className="text-xs" /> Cancella tutti i filtri
                </button>
              )}
            </div>
          )}

          {error && <p className="px-4 py-3 text-sm text-red-500">{error}</p>}

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">PASTO</th>
                  <th className="px-4 py-3">CATEGORIA</th>
                  <th className="px-4 py-3">CALORIE</th>
                  <th className="px-4 py-3">PROTEINA</th>
                  <th className="px-4 py-3">CARBOIDRATI</th>
                  <th className="px-4 py-3">GRASSO</th>
                  <th className="px-4 py-3 text-right">AZIONI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-[13px] text-slate-700">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Caricamento...</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Nessun pasto trovato.</td></tr>
                ) : paginated.map((meal) => {
                  const imgSrc = getImageUrl(meal.image);
                  return (
                    <tr key={meal._id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-slate-100 text-base">
                            {imgSrc
                              ? <img src={imgSrc} alt={meal.name} className="h-full w-full object-cover" />
                              : "🍽️"}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{meal.name}</p>
                            <p className="text-[11px] text-slate-500">{meal.portionSize}g</p>
                            {meal.description && (
                              <p className="text-[11px] text-slate-400 max-w-50 truncate">{meal.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${BADGE[meal.category]}`}>
                          {BADGE_LABEL[meal.category]}
                        </span>
                      </td>
                      <td className="px-4 py-3">{meal.nutrition.calories} kcal</td>
                      <td className="px-4 py-3">{meal.nutrition.protein} g</td>
                      <td className="px-4 py-3">{meal.nutrition.carbohydrates} g</td>
                      <td className="px-4 py-3">{meal.nutrition.fat} g</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2 text-slate-500">
                          <button onClick={() => openEdit(meal)} className="rounded-md p-1.5 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Edit">
                            <FiEdit2 className="text-sm" />
                          </button>
                          <button onClick={() => handleDelete(meal._id)} className="rounded-md p-1.5 transition hover:bg-red-50 hover:text-red-600" aria-label="Delete">
                            <FiTrash2 className="text-sm" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-slate-200 px-3 py-3 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <span>Mostrando {paginated.length} di {filtered.length} pasti</span>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} className="rounded-full border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-40">
                <FiChevronLeft />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`h-6 w-6 rounded-full text-[11px] ${safePage === p ? "bg-[#8F00FF] text-white" : "hover:bg-slate-100"}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="rounded-full border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-40">
                <FiChevronRight />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Modal ─────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/45 px-3 py-4 sm:px-4 sm:py-8">
          <button className="absolute inset-0" onClick={closeModal} aria-label="Close" />

          <div className="relative z-10 my-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8">
            <h2 className="text-[24px] font-semibold tracking-tight text-[#8F00FF] sm:text-[32px]">
              {editId ? "Modifica pasto" : "Crea un nuovo pasto"}
            </h2>
            <p className="mt-1 text-[13px] text-slate-500">
              Definisci il profilo nutrizionale per il pasto.
            </p>

            {formError && (
              <div className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 border border-red-200">{formError}</div>
            )}

            <div className="mt-5 space-y-4">
              {/* Image upload */}
              <div>
                <label className="mb-2 block text-[12px] font-semibold text-slate-700">Immagine</label>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-32 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white transition hover:bg-slate-50 overflow-hidden"
                >
                  {imagePreview
                    ? <img src={imagePreview} alt="preview" className="h-full w-full object-cover" />
                    : <>
                        <FiUploadCloud className="text-2xl text-[#8F00FF]" />
                        <p className="mt-2 text-[13px] font-medium text-slate-700">Carica immagine</p>
                        <p className="text-[11px] text-slate-400">JPEG, PNG, WebP</p>
                      </>}
                </button>
              </div>

              {/* Name */}
              <div>
                <label className="mb-2 block text-[12px] font-semibold text-slate-700">Nome del pasto</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-[#8F00FF] transition"
                  placeholder="es. Salmone alla griglia"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-[12px] font-semibold text-slate-700">
                  Descrizione del pasto <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#8F00FF] transition resize-none"
                  placeholder="Composizione del pasto, grammi degli ingredienti, ricetta o modalità di cottura..."
                />
              </div>

              {/* Portion Type */}
              <div>
                <label className="mb-2 block text-[12px] font-semibold text-slate-700">Tipo porzione</label>
                <div className="flex gap-3">
                  {(["Small", "Medium", "Large"] as PortionType[]).map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, portionType: pt }))}
                      className={`flex-1 rounded-lg border px-3 py-2 text-[12px] font-semibold transition ${
                        form.portionType === pt
                          ? "border-[#8F00FF] bg-[#8F00FF]/5 text-[#8F00FF]"
                          : "border-slate-200 text-slate-600 hover:border-[#8F00FF]"
                      }`}
                    >
                      {pt === "Small" ? "Piccola" : pt === "Medium" ? "Media" : "Grande"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category + Portion */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[12px] font-semibold text-slate-700">Categoria</label>
                  <div className="relative">
                    <select
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      className="h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-[#8F00FF] transition"
                    >
                      {CATEGORY_LABELS.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <FiChevronDown className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-[12px] font-semibold text-slate-700">Porzione</label>
                  <div className="relative">
                    <input
                      type="number" min="1"
                      value={form.portionSize}
                      onChange={(e) => setForm((f) => ({ ...f, portionSize: e.target.value }))}
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 pr-14 text-[13px] outline-none focus:border-[#8F00FF] transition"
                      placeholder="0"
                    />
                    <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[12px] text-slate-400">grammi</span>
                  </div>
                </div>
              </div>

              {/* Nutrition */}
              <div>
                <p className="mb-3 text-[12px] font-semibold text-[#8F00FF]">▣ Nutrizioni</p>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                  {(["calories","protein","carbohydrates","fat"] as const).map((field) => {
                    const MULTIPLIER = { protein: 4, carbohydrates: 4, fat: 9 } as const;
                    const val = Number((form as Record<string, string>)[field]) || 0;
                    const mul = field !== "calories" ? MULTIPLIER[field] : null;
                    const kcalFromMacro = mul !== null ? val * mul : null;
                    return (
                      <div key={field}>
                        <label className="mb-2 block text-[12px] font-semibold text-slate-600 capitalize">
                          {field === "calories" ? "Calorie (kcal)" : field === "protein" ? "Proteine (g)" : field === "carbohydrates" ? "Carboidrati (g)" : "Grassi (g)"}
                        </label>
                        <input
                          type="number" min="0"
                          value={(form as Record<string, string>)[field]}
                          onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                          className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-[13px] outline-none focus:border-[#8F00FF] transition"
                          placeholder="0"
                        />
                        {kcalFromMacro !== null && val > 0 && (
                          <p className="mt-1 text-[10px] text-slate-400">
                            {val}g × {mul} = {kcalFromMacro} kcal
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Calorie breakdown banner */}
                {(() => {
                  const p = Number(form.protein) || 0;
                  const c = Number(form.carbohydrates) || 0;
                  const f = Number(form.fat) || 0;
                  const enteredCal = Number(form.calories) || 0;
                  const calcCal = p * 4 + c * 4 + f * 9;
                  if (calcCal === 0 && enteredCal === 0) return null;
                  const diff = enteredCal > 0 ? Math.abs(enteredCal - calcCal) : 0;
                  const warn = enteredCal > 0 && diff > enteredCal * 0.1;
                  return (
                    <div className={`mt-3 rounded-xl border px-4 py-3 text-[12px] ${warn ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                      <p className="font-semibold mb-1">
                        {warn ? `⚠ Totale macro (${calcCal} kcal) ≠ calorie inserite (${enteredCal} kcal)` : `Totale da macro: ${calcCal} kcal`}
                      </p>
                      <p>
                        Proteine {p}g × 4 = <strong>{p * 4} kcal</strong>
                        &nbsp;·&nbsp;
                        Carboidrati {c}g × 4 = <strong>{c * 4} kcal</strong>
                        &nbsp;·&nbsp;
                        Grassi {f}g × 9 = <strong>{f * 9} kcal</strong>
                      </p>
                    </div>
                  );
                })()}

              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button onClick={closeModal} className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-700">
                <FiX className="text-xs" /> Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#8F00FF] px-8 text-[12px] font-semibold text-white transition hover:bg-[#7A00E5] sm:w-auto disabled:opacity-60"
              >
                {saving ? "Salvataggio..." : editId ? "Salva modifiche" : "Pubblica pasto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
