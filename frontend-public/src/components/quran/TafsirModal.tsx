"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

type TafsirModalProps = {
  open: boolean;
  onClose: () => void;
  ayahNumber: number | null;
  surahName: string;
  content: string | null;
  loading: boolean;
  error: string | null;
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function TafsirModal({
  open,
  onClose,
  ayahNumber,
  surahName,
  content,
  loading,
  error,
}: TafsirModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 10);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.hasAttribute("disabled"),
      );

      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-[2px] sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tafsir-modal-title"
        className="nft-card relative flex max-h-[80vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-surface shadow-2xl"
        tabIndex={-1}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Tafsir Ayat</p>
            <h2 id="tafsir-modal-title" className="mt-1 text-lg font-black text-slate-900">
              {surahName}
              {ayahNumber ? ` - Ayat ${ayahNumber}` : ""}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-slate-700 transition-colors hover:border-primary hover:text-primary"
            aria-label="Tutup tafsir"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-5 pb-20 sm:px-6">
          {loading ? (
            <p className="rounded-xl border border-border bg-background px-4 py-4 text-sm font-semibold text-slate-500">
              Memuat tafsir...
            </p>
          ) : error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-600">{error}</p>
          ) : content ? (
            <div className="space-y-4 text-sm leading-7 text-slate-700">
              {content.split("\n\n").map((paragraph, index) => (
                <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-background px-4 py-4 text-sm font-semibold text-slate-500">
              Tafsir untuk ayat ini belum tersedia.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
