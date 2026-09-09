"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { getCurrentUser } from "@/src/lib/authService";
import {
  deleteSavedContent,
  downloadSavedPdf,
  listSavedContent,
  type SavedContentItem,
} from "@/src/lib/savedContent";

export default function SavedMealsPage() {
  const [items, setItems] = useState<SavedContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const user = getCurrentUser();
    if (!user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      setItems(await listSavedContent(user.id));
    } catch {
      toast.error("Impossibile caricare i contenuti salvati.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleOpen(item: SavedContentItem) {
    try {
      await downloadSavedPdf(item._id, `${item.title}.pdf`);
    } catch {
      toast.error("Impossibile scaricare il PDF.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSavedContent(id);
      setItems((prev) => prev.filter((item) => item._id !== id));
      toast.success("Contenuto rimosso.");
    } catch {
      toast.error("Eliminazione fallita.");
    }
  }

  const meals = items.filter((item) => item.type === "day");
  const strategies = items.filter((item) => item.type === "strategy");
  const user = getCurrentUser();

  return (
    <section className="bg-[#f5f4f0] py-8 md:py-12">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <h1 className="text-2xl font-semibold text-gray-900">Pasti salvati</h1>
        <p className="mt-2 text-sm text-gray-500">
          Giornate e strategie salvate sul tuo account, con PDF scaricabile.
        </p>

        {!user?.id ? (
          <p className="mt-6 rounded-xl border border-dashed border-gray-200 bg-white px-4 py-6 text-sm text-gray-500">
            Accedi per vedere i contenuti salvati su tutti i dispositivi.
          </p>
        ) : loading ? (
          <p className="mt-6 text-sm text-gray-500">Caricamento...</p>
        ) : (
          <>
            <SavedSection
              title="Giornate salvate"
              empty="Nessuna giornata salvata. Dal piano pasto usa SALVA QUESTA GIORNATA."
              items={meals}
              onOpen={handleOpen}
              onDelete={handleDelete}
            />
            <SavedSection
              title="Strategie salvate"
              empty="Nessuna strategia salvata. Dallo sgarro usa SALVA STRATEGIA."
              items={strategies}
              onOpen={handleOpen}
              onDelete={handleDelete}
            />
          </>
        )}

        <Link href="/mealPlans" className="mt-8 inline-block text-sm font-semibold text-[#8F00FF]">
          Torna ai piani pasto →
        </Link>
      </div>
    </section>
  );
}

function SavedSection({
  title,
  empty,
  items,
  onOpen,
  onDelete,
}: {
  title: string;
  empty: string;
  items: SavedContentItem[];
  onOpen: (item: SavedContentItem) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-gray-200 bg-white px-4 py-6 text-sm text-gray-500">
          {empty}
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {items.map((item) => (
            <article key={item._id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-xs text-gray-400">
                    {new Date(item.createdAt).toLocaleString("it-IT")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onOpen(item)}
                    className="rounded-full bg-[#8F00FF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7A00E5]"
                  >
                    Scarica PDF
                  </button>
                  <button
                    onClick={() => onDelete(item._id)}
                    className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-red-50 hover:text-red-600"
                  >
                    Elimina
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
