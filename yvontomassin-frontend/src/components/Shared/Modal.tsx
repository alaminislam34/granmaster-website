"use client";

import { useEffect, useId, useRef } from "react";
import { FiX } from "react-icons/fi";

const SIZE = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-5xl",
} as const;

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  hideHeader = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: keyof typeof SIZE;
  hideHeader?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);

    const first = focusable()[0];
    first?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = focusable();
      if (nodes.length === 0) return;
      const start = nodes[0];
      const end = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === start) {
        e.preventDefault();
        end.focus();
      } else if (!e.shiftKey && document.activeElement === end) {
        e.preventDefault();
        start.focus();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 flex w-full ${SIZE[size]} max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Fixed / Sticky Header ────────────────────────────── */}
        {!hideHeader && (
          <div className="shrink-0 border-b border-slate-100 bg-white px-6 py-4.5 sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="truncate text-lg font-semibold text-slate-900 sm:text-xl">
                  {title}
                </h2>
                {subtitle && (
                  <p className="mt-0.5 truncate text-[13px] text-slate-500">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Chiudi"
              >
                <FiX className="text-base" />
              </button>
            </div>
          </div>
        )}

        {/* ── Scrollable Body ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-8">
          {children}
        </div>

        {/* ── Fixed / Sticky Footer ───────────────────────────── */}
        {footer && (
          <div className="shrink-0 border-t border-slate-100 bg-slate-50/90 px-6 py-4 backdrop-blur-sm sm:px-8">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
