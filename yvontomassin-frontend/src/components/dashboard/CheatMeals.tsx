"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FiChevronLeft, FiChevronRight, FiEdit2,
  FiPlus, FiTrash2, FiUploadCloud, FiX,
} from "react-icons/fi";
import {
  PiFireBold, PiForkKnifeBold, PiGaugeBold, PiSparkleBold,
} from "react-icons/pi";
import baseApi from "@/src/api/baseApi";
import { ENDPOINTS } from "@/src/api/endPoints";
import { toast } from "sonner";
import { getImageUrl } from "@/src/lib/imageUrl";
import SquareMealImage from "@/src/components/Shared/SquareMealImage";
import Modal from "@/src/components/Shared/Modal";
import ConfirmModal from "@/src/components/Shared/ConfirmModal";
import { MealTableRowSkeleton } from "@/src/components/Shared/skeletons";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CheatNutrition { calories: number; protein: number; carbohydrates: number; fat: number; }
interface CheatMeal {
  _id: string; name: string; description: string;
  image?: string; nutrition: CheatNutrition; createdAt: string;
}

const EMPTY_FORM = { name: "", description: "", calories: "", protein: "", carbohydrates: "", fat: "" };
const PAGE_SIZE = 8;

export default function CheatMeals() {
  const [meals, setMeals]         = useState<CheatMeal[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [page, setPage]           = useState(1);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState("");
  const fileInputRef              = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<CheatMeal | null>(null);
  const [deleting, setDeleting]   = useState(false);

  // ─── Fetch ──────────────────────────────────────────────────────────────────
  const fetchMeals = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await baseApi.get(ENDPOINTS.cheat);
      setMeals(res.data?.data ?? []);
    } catch {
      setError("Impossibile caricare gli sgarri.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMeals(); }, [fetchMeals]);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  function openCreate() {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setImageFile(null);
    setImagePreview("");
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(meal: CheatMeal) {
    setEditId(meal._id);
    setForm({
      name: meal.name,
      description: meal.description,
      calories: String(meal.nutrition.calories),
      protein: String(meal.nutrition.protein),
      carbohydrates: String(meal.nutrition.carbohydrates),
      fat: String(meal.nutrition.fat),
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

  // Helper function for calorie validation
  const calculateExpectedCalories = (protein: number, carbs: number, fat: number): number => {
    return Math.round((protein * 4) + (carbs * 4) + (fat * 9));
  };

  const validateCalorieConsistency = (calories: number, protein: number, carbs: number, fat: number): string | null => {
    const expected = calculateExpectedCalories(protein, carbs, fat);
    const tolerance = Math.max(5, expected * 0.05); // 5% tolerance or minimum 5 calories
    
    if (Math.abs(calories - expected) > tolerance) {
      return `Le calorie (${calories}) non corrispondono ai macronutrienti. Calorie previste: ${expected} (±${Math.round(tolerance)})`;
    }
    return null;
  };

  // ─── Save ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    setFormError("");
    if (!form.name.trim()) { setFormError("Il nome è obbligatorio"); return; }
    if (!form.description.trim() || form.description.trim().length < 5) { setFormError("La descrizione deve avere almeno 5 caratteri"); return; }
    if (!form.calories) { setFormError("Le calorie sono obbligatorie"); return; }

    // Validate calorie consistency
    const calories = Number(form.calories);
    const protein = Number(form.protein) || 0;
    const carbs = Number(form.carbohydrates) || 0;
    const fat = Number(form.fat) || 0;
    
    const validationError = validateCalorieConsistency(calories, protein, carbs, fat);
    if (validationError) { 
      setFormError(validationError); 
      return; 
    }

    const fd = new FormData();
    if (imageFile) fd.append("image", imageFile);
    fd.append("data", JSON.stringify({
      name: form.name.trim(),
      description: form.description.trim(),
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
        await baseApi.patch(`${ENDPOINTS.cheat}/${editId}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Sgarro aggiornato!");
      } else {
        await baseApi.post(ENDPOINTS.cheatCreate, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Sgarro pubblicato!");
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

  // ─── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await baseApi.delete(`${ENDPOINTS.cheat}/${deleteTarget._id}`);
      setMeals((prev) => prev.filter((m) => m._id !== deleteTarget._id));
      toast.success("Sgarro eliminato.");
      setDeleteTarget(null);
    } catch {
      toast.error("Eliminazione fallita.");
    } finally {
      setDeleting(false);
    }
  }

  // ─── Pagination ──────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(meals.length / PAGE_SIZE));
  const paginated  = meals.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ─── Stats ───────────────────────────────────────────────────────────────────
  const avgCal = meals.length
    ? Math.round(meals.reduce((s, m) => s + m.nutrition.calories, 0) / meals.length)
    : 0;
  const topMeal = meals.length
    ? meals.reduce((best, m) => m.nutrition.calories > best.nutrition.calories ? m : best, meals[0])
    : null;

  const cards = [
    { label: "BIBLIOTECA TOTALE", value: String(meals.length), note: "Selezione", helper: "sgarri totali", icon: PiForkKnifeBold, accent: "bg-[#8F00FF]/10 text-[#8F00FF]" },
    { label: "IMPATTO MEDIO", value: String(avgCal), note: "kcal/pasto", helper: "Densità media", icon: PiGaugeBold, accent: "bg-[#8F00FF]/5 text-[#8F00FF]" },
    { label: "SELEZIONE POPOLARE", value: topMeal?.name?.split(" ")[0] ?? "—", note: "", helper: "Più calorico", icon: PiSparkleBold, accent: "bg-[#8F00FF]/10 text-[#8F00FF]" },
    { label: "CALORIE MAX", value: topMeal ? String(topMeal.nutrition.calories) : "—", note: "kcal", helper: "Premium meal", icon: PiFireBold, accent: "bg-[#8F00FF]/5 text-[#8F00FF]" },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="mx-auto w-full space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[28px] leading-none font-semibold tracking-[-0.02em] text-slate-900 sm:text-[34px] md:text-[38px]">
              Pasti imbrogliati
            </h1>
            <p className="mt-1 text-[12px] text-slate-500 sm:text-[13px]">
              Gestisci il catalogo sgarro.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#8F00FF] px-3 text-[12px] font-semibold whitespace-nowrap text-white shadow-[0_8px_22px_-12px_rgba(143,0,255,0.8)] transition hover:bg-[#7A00E5] sm:h-11 sm:px-5 sm:text-[13px]"
          >
            <FiPlus className="text-sm" /> Aggiungi un nuovo pasto
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500">{item.label}</p>
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${item.accent}`}>
                    <Icon className="text-base" />
                  </span>
                </div>
                <p className="mt-1 text-[28px] leading-none font-semibold text-slate-900 sm:text-[32px]">
                  {item.value}
                  <span className="ml-1 text-[13px] font-medium text-slate-500">{item.note}</span>
                </p>
                <p className="mt-1 text-[11px] text-[#8F00FF]">↗ {item.helper}</p>
              </div>
            );
          })}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-[16px] font-semibold text-slate-800">Inventario dei pasti</h2>
          </div>

          {error && <p className="px-4 py-3 text-sm text-red-500">{error}</p>}

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">PASTO</th>
                  <th className="px-4 py-3">CALORIE</th>
                  <th className="px-4 py-3">PROTEINA</th>
                  <th className="px-4 py-3">CARBOIDRATI</th>
                  <th className="px-4 py-3">GRASSO</th>
                  <th className="px-4 py-3 text-right">AZIONI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-[13px] text-slate-700">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <MealTableRowSkeleton key={i} columns={6} />
                  ))
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Nessuno sgarro trovato.</td></tr>
                ) : paginated.map((meal) => {
                  const imgSrc = getImageUrl(meal.image);
                  return (
                    <tr key={meal._id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 overflow-hidden rounded-md bg-slate-100">
                            <SquareMealImage src={imgSrc} alt={meal.name} fallback="🍔" className="rounded-md" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{meal.name}</p>
                            <p className="text-[11px] text-slate-500 max-w-[200px] truncate">{meal.description}</p>
                          </div>
                        </div>
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
                          <button onClick={() => setDeleteTarget(meal)} className="rounded-md p-1.5 transition hover:bg-red-50 hover:text-red-600" aria-label="Delete">
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
            <span>Mostrando {paginated.length} di {meals.length} pasti</span>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-full border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-40">
                <FiChevronLeft />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`h-6 w-6 rounded-full text-[11px] ${page === p ? "bg-[#8F00FF] text-white" : "hover:bg-slate-100"}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-full border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-40">
                <FiChevronRight />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Modal ──────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <Modal
          open
          onClose={closeModal}
          title={editId ? "Modifica sgarro" : "Aggiungi uno sgarro"}
          size="lg"
        >
          <p className="-mt-2 text-[13px] text-slate-500">
            Documenta la tua indulgenza culinaria con precisione e stile.
          </p>

            {formError && (
              <div className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 border border-red-200">{formError}</div>
            )}

            <div className="mt-5 space-y-4">
              {/* Image */}
              <div>
                <label className="mb-2 block text-[12px] font-semibold text-slate-700">Foto del pasto</label>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-32 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white transition hover:bg-slate-50 overflow-hidden"
                >
                  {imagePreview
                    ? <SquareMealImage src={imagePreview} alt="preview" className="max-h-64" />
                    : <>
                        <FiUploadCloud className="text-2xl text-[#8F00FF]" />
                        <p className="mt-2 text-[14px] font-medium text-slate-700">Carica la foto 1:1</p>
                        <p className="mt-1 text-[11px] text-slate-400">Formato quadrato consigliato</p>
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
                  placeholder="es., Hamburger di manzo al tartufo Wagyu"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-[12px] font-semibold text-slate-700">Descrizione</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="min-h-24 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-[13px] outline-none focus:border-[#8F00FF] transition"
                  placeholder="Descrivi i sapori, la consistenza e perché era il piacere perfetto..."
                />
              </div>

              {/* Nutrition */}
              <div>
                <p className="mb-3 text-[12px] font-semibold text-[#8F00FF]">▣ Nutrizioni</p>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                  {(["calories","protein","carbohydrates","fat"] as const).map((field) => (
                    <div key={field}>
                      <label className="mb-2 block text-[12px] font-semibold text-slate-600">
                        {field === "calories" ? "Calorie" : field === "protein" ? "Proteina" : field === "carbohydrates" ? "Carboidrati" : "Grasso"}
                      </label>
                      <input
                        type="number" min="0"
                        value={(form as Record<string, string>)[field]}
                        onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-[13px] outline-none focus:border-[#8F00FF] transition"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button onClick={closeModal} className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-700">
                <FiX className="text-xs" /> Annulla modifiche
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#8F00FF] px-8 text-[12px] font-semibold text-white transition hover:bg-[#7A00E5] sm:w-auto disabled:opacity-60"
              >
                {saving ? "Salvataggio..." : editId ? "Salva modifiche" : "Pubblica sgarro"}
              </button>
            </div>
        </Modal>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => { if (!deleting) setDeleteTarget(null); }}
        onConfirm={() => void handleDelete()}
        loading={deleting}
        title="Eliminare questo sgarro?"
        description={
          <>
            Stai per eliminare{" "}
            <span className="font-semibold text-slate-800">{deleteTarget?.name}</span>.
            Questa azione è irreversibile.
          </>
        }
      />
    </>
  );
}
