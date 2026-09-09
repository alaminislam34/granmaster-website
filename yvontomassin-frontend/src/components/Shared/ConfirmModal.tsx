"use client";

import { FiTrash2 } from "react-icons/fi";
import Modal from "@/src/components/Shared/Modal";

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Sì, elimina",
  cancelLabel = "Annulla",
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={loading ? () => {} : onClose} title={title} size="sm" hideHeader>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
        <FiTrash2 className="h-6 w-6 text-red-600" />
      </div>
      <div className="mt-4 text-center">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <div className="mt-2 text-sm text-slate-500">{description}</div>
      </div>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {loading ? "Eliminazione..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
