"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BookOpenText, Loader2, X } from "lucide-react";

const ITEMS_PER_PAGE = 20;
const HADITH_EXCERPT_LENGTH = 100;
const TITLE_EXCERPT_LENGTH = 92;

interface HadithItem {
  id: string;
  title: string;
  hadeeth: string;
}

interface HadithDetail {
  id: string;
  title: string;
  hadeeth: string;
  attribution: string;
  grade: string;
  explanation: string;
  hadeeth_ar: string;
  hadeeth_intro: string;
  hadeeth_intro_ar: string;
}

interface HadithListApiResponse {
  items?: unknown[];
  pagination?: {
    page?: number;
    per_page?: number;
    total_items?: number;
    total_pages?: number;
  };
  data?: unknown[];
  meta?: {
    current_page?: number | string;
    last_page?: number | string;
    total_items?: number | string;
    per_page?: number | string;
  };
}

function toPositiveInt(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const intValue = Math.trunc(parsed);
  return intValue > 0 ? intValue : fallback;
}

function shortenText(value: string, maxLength: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trimEnd()}...`;
}

function parseHadithItems(source: unknown[]): HadithItem[] {
  return source
    .map<HadithItem | null>((item, index) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;

      const id = String(obj.id ?? "").trim();
      if (!id) return null;

      const title = String(obj.title ?? obj.id_indonesia ?? "").trim();
      const hadeeth = String(obj.hadeeth ?? "").trim();
      const fallbackTitle = title || `Hadist #${toPositiveInt(id, index + 1)}`;

      return {
        id,
        title: fallbackTitle,
        hadeeth,
      };
    })
    .filter((item): item is HadithItem => item !== null && Boolean(item.title || item.hadeeth));
}

function parseHadithDetail(payload: unknown, fallbackId = ""): HadithDetail | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  const id = String(obj.id ?? fallbackId).trim();
  if (!id) return null;

  return {
    id,
    title: String(obj.title ?? "").trim(),
    hadeeth: String(obj.hadeeth ?? "").trim(),
    attribution: String(obj.attribution ?? "").trim(),
    grade: String(obj.grade ?? "").trim(),
    explanation: String(obj.explanation ?? "").trim(),
    hadeeth_ar: String(obj.hadeeth_ar ?? "").trim(),
    hadeeth_intro: String(obj.hadeeth_intro ?? "").trim(),
    hadeeth_intro_ar: String(obj.hadeeth_intro_ar ?? "").trim(),
  };
}

function parseHadithResponse(payload: unknown, requestedPage: number) {
  if (Array.isArray(payload)) {
    const totalItems = payload.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
    const page = Math.min(requestedPage, totalPages);
    const startIndex = (page - 1) * ITEMS_PER_PAGE;

    return {
      items: parseHadithItems(payload.slice(startIndex, startIndex + ITEMS_PER_PAGE)),
      page,
      totalPages,
      totalItems,
    };
  }

  if (!payload || typeof payload !== "object") {
    return {
      items: [] as HadithItem[],
      page: requestedPage,
      totalPages: 1,
      totalItems: 0,
    };
  }

  const response = payload as HadithListApiResponse;
  const itemSource = Array.isArray(response.items)
    ? response.items
    : Array.isArray(response.data)
      ? response.data
      : [];

  const pagination = response.pagination;
  const meta = response.meta;
  const hasPaginationInfo = Boolean(
    pagination?.page ?? pagination?.total_pages ?? pagination?.total_items ?? meta?.current_page ?? meta?.last_page ?? meta?.total_items
  );

  if (!hasPaginationInfo) {
    const totalItems = itemSource.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
    const page = Math.min(requestedPage, totalPages);
    const startIndex = (page - 1) * ITEMS_PER_PAGE;

    return {
      items: parseHadithItems(itemSource.slice(startIndex, startIndex + ITEMS_PER_PAGE)),
      page,
      totalPages,
      totalItems,
    };
  }

  const totalItems = toPositiveInt(pagination?.total_items ?? meta?.total_items, itemSource.length);
  const totalPages = toPositiveInt(
    pagination?.total_pages ?? meta?.last_page,
    Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))
  );
  const page = Math.min(toPositiveInt(pagination?.page ?? meta?.current_page, requestedPage), totalPages);

  return {
    items: parseHadithItems(itemSource),
    page,
    totalPages,
    totalItems,
  };
}

function getGradeTone(grade: string) {
  const normalizedGrade = grade.toLowerCase();

  if (
    normalizedGrade.includes("sahih") ||
    normalizedGrade.includes("shahih") ||
    normalizedGrade.includes("صحيح")
  ) {
    return {
      badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
      dotClass: "bg-emerald-500",
    };
  }

  if (normalizedGrade.includes("hasan") || normalizedGrade.includes("حسن")) {
    return {
      badgeClass: "border-sky-200 bg-sky-50 text-sky-700",
      dotClass: "bg-sky-500",
    };
  }

  if (
    normalizedGrade.includes("dhaif") ||
    normalizedGrade.includes("daif") ||
    normalizedGrade.includes("ضعيف")
  ) {
    return {
      badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
      dotClass: "bg-rose-500",
    };
  }

  return {
    badgeClass: "border-slate-200 bg-slate-100 text-slate-600",
    dotClass: "bg-slate-400",
  };
}

function GradeBadge({ grade }: { grade: string }) {
  const label = grade || "Belum dinilai";
  const tone = getGradeTone(label);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${tone.badgeClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dotClass}`} aria-hidden="true" />
      {label}
    </span>
  );
}

export default function HadistDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const categoryIdParam = params.id;
  const categoryId = Array.isArray(categoryIdParam) ? categoryIdParam[0] : categoryIdParam;
  const categoryKey = categoryId ?? "";
  const titleFromQuery = (searchParams.get("title") ?? "").trim();

  const [hadiths, setHadiths] = useState<HadithItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageState, setPageState] = useState<{ categoryKey: string; page: number }>({ categoryKey: "", page: 1 });
  const [totalPage, setTotalPage] = useState(1);
  const [categoryTitlesById, setCategoryTitlesById] = useState<Record<string, string>>({});
  const [detailsById, setDetailsById] = useState<Record<string, HadithDetail>>({});
  const [selectedHadithId, setSelectedHadithId] = useState<string | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const page = pageState.categoryKey === categoryKey ? pageState.page : 1;
  const categoryTitle = titleFromQuery || (categoryId ? categoryTitlesById[categoryId] ?? "" : "");

  const selectedListItem = selectedHadithId ? hadiths.find((item) => item.id === selectedHadithId) ?? null : null;
  const selectedDetail = selectedHadithId ? detailsById[selectedHadithId] ?? null : null;

  const openHadithModal = useCallback(
    (hadithId: string) => {
      setSelectedHadithId(hadithId);
      setSelectedError(null);
      setSelectedLoading(!detailsById[hadithId]);
    },
    [detailsById]
  );

  const closeHadithModal = useCallback(() => {
    setSelectedHadithId(null);
    setSelectedLoading(false);
    setSelectedError(null);
  }, []);

  const updatePage = useCallback(
    (nextPage: number | ((currentPage: number) => number)) => {
      if (!categoryKey) return;

      setPageState((previous) => {
        const currentPage = previous.categoryKey === categoryKey ? previous.page : 1;
        const resolvedPage = typeof nextPage === "function" ? nextPage(currentPage) : nextPage;
        const safePage = Math.max(1, resolvedPage);

        if (previous.categoryKey === categoryKey && previous.page === safePage) {
          return previous;
        }

        return { categoryKey, page: safePage };
      });
    },
    [categoryKey]
  );

  const fetchHadithDetail = useCallback(async (hadithId: string) => {
    const payload = await fetch(`/api/public/hadith/hadist/${encodeURIComponent(hadithId)}`, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);

    return parseHadithDetail(payload, hadithId);
  }, []);

  useEffect(() => {
    if (!categoryId) {
      return;
    }

    const activeCategoryId = categoryId;
    let cancelled = false;

    async function loadHadiths() {
      setLoading(true);
      setError(null);

      const payload = await fetch(
        `/api/public/hadith/hadist?category_id=${encodeURIComponent(activeCategoryId)}&page=${page}&per_page=${ITEMS_PER_PAGE}`,
        {
          method: "GET",
          headers: { accept: "application/json" },
          cache: "no-store",
        }
      )
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null);

      if (cancelled) return;

      if (!payload) {
        setError("Gagal memuat hadist.");
        setHadiths([]);
        setLoading(false);
        return;
      }

      const parsed = parseHadithResponse(payload, page);
      setHadiths(parsed.items);
      setTotalPage(parsed.totalPages);

      if (parsed.page !== page) {
        updatePage(parsed.page);
      }

      if (parsed.totalItems === 0) {
        setError("Hadist belum tersedia.");
      }

      setLoading(false);
    }

    loadHadiths();

    return () => {
      cancelled = true;
    };
  }, [categoryId, page, updatePage]);

  useEffect(() => {
    if (!selectedHadithId || selectedDetail) return;

    const activeHadithId = selectedHadithId;

    let cancelled = false;

    async function loadSelectedDetail() {
      setSelectedLoading(true);
      setSelectedError(null);

      const detail = await fetchHadithDetail(activeHadithId);
      if (cancelled) return;

      if (!detail) {
        setSelectedError("Detail hadist belum dapat dimuat.");
        setSelectedLoading(false);
        return;
      }

      setDetailsById((previous) => ({ ...previous, [activeHadithId]: detail }));
      setSelectedLoading(false);
    }

    loadSelectedDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedHadithId, selectedDetail, fetchHadithDetail]);

  useEffect(() => {
    if (!selectedHadithId) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeHadithModal();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = originalOverflow;
    };
  }, [selectedHadithId, closeHadithModal]);

  useEffect(() => {
    if (!categoryId || titleFromQuery) return;

    const activeCategoryId = categoryId;
    let cancelled = false;

    async function loadCategoryTitle() {
      const payload = await fetch("/api/public/hadith/kategori", {
        method: "GET",
        headers: { accept: "application/json" },
        cache: "force-cache",
      })
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null);

      if (cancelled) return;

      const categories = Array.isArray(payload)
        ? payload
        : payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)
          ? (payload as { data: unknown[] }).data
          : [];

      const cat = categories.find((item) => {
        if (!item || typeof item !== "object") return false;
        const obj = item as Record<string, unknown>;
        return Number(obj.id) === Number(activeCategoryId) || Number(obj.category_id) === Number(activeCategoryId);
      });

      const resolvedTitle = cat && typeof cat === "object" ? String((cat as Record<string, unknown>).title ?? "") : "";

      setCategoryTitlesById((previous) => {
        if (previous[activeCategoryId] === resolvedTitle) {
          return previous;
        }

        return { ...previous, [activeCategoryId]: resolvedTitle };
      });
    }

    loadCategoryTitle();

    return () => {
      cancelled = true;
    };
  }, [categoryId, titleFromQuery]);

  return (
    <div className="relative overflow-hidden py-14 sm:py-16">
      <div className="ambient-glow top-[-220px] left-[-120px] bg-primary/25" />
      <div className="ambient-glow bottom-[-260px] right-[-140px] bg-brand-accent/15" />

      <div className="container-custom relative z-10 space-y-8">
        <section className="nft-card p-6 sm:p-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <Link
              href="/hadist"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <ArrowLeft size={16} />
              Kembali ke Daftar Kitab
            </Link>

            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-primary">
              <BookOpenText size={14} />
              Koleksi Hadist
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {categoryTitle || `Kitab #${categoryId}`}
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-500 sm:text-base">
              Halaman {page} dari {totalPage}
            </p>
          </motion.div>
        </section>

        {!categoryId ? (
          <div className="nft-card p-6 text-sm font-semibold text-red-600">Kategori hadist tidak valid.</div>
        ) : loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="mr-3 h-6 w-6 animate-spin text-primary" />
            <span className="font-semibold">Memuat hadist...</span>
          </div>
        ) : error ? (
          <div className="nft-card p-6 text-sm font-semibold text-red-600">{error}</div>
        ) : hadiths.length === 0 ? (
          <div className="nft-card p-6 text-sm font-semibold text-slate-500">Tidak ada hadist ditemukan.</div>
        ) : (
          <section className="space-y-4">
            {hadiths.map((hadith, index) => (
              <motion.button
                key={hadith.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: Math.min(index * 0.03, 0.18) }}
                type="button"
                onClick={() => openHadithModal(hadith.id)}
                className="nft-card group w-full p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 px-2 text-sm font-black text-primary">
                    {hadith.id}
                  </div>
                </div>

                <h2 className="mt-4 text-lg font-black leading-snug text-slate-900 sm:text-xl">
                  {shortenText(hadith.title, TITLE_EXCERPT_LENGTH) || `Hadist #${hadith.id}`}
                </h2>

                <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
                  {shortenText(hadith.hadeeth, HADITH_EXCERPT_LENGTH) || "Ringkasan hadist belum tersedia."}
                </p>
              </motion.button>
            ))}
          </section>
        )}

        {totalPage > 1 && !loading && (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => updatePage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <span className="text-sm font-semibold text-slate-500">
              Halaman {page} / {totalPage}
            </span>
            <button
              onClick={() => updatePage((p) => Math.min(totalPage, p + 1))}
              disabled={page === totalPage}
              className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Selanjutnya
            </button>
          </div>
        )}

        <AnimatePresence>
          {selectedHadithId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm sm:p-6"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  closeHadithModal();
                }
              }}
            >

              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 18 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.22 }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="hadist-modal-title"
                className="relative flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border bg-background p-5 shadow-2xl sm:p-6"
              >
                <div className="z-10 mb-4 flex shrink-0 items-center justify-between gap-3 bg-background/95 pb-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                  <p id="hadist-modal-title" className="pr-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Detail Hadist #{selectedHadithId}
                  </p>
                  <button
                    type="button"
                    onClick={closeHadithModal}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-slate-100 text-slate-800 shadow-sm transition hover:border-primary hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    aria-label="Tutup popup"
                  >
                    <X size={20} strokeWidth={2.5} />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 pb-20">
                  {selectedLoading && !selectedDetail ? (
                    <div className="flex items-center justify-center py-16 text-slate-500">
                      <Loader2 className="mr-3 h-6 w-6 animate-spin text-primary" />
                      <span className="font-semibold">Memuat detail hadist...</span>
                    </div>
                  ) : selectedError ? (
                    <div className="nft-card p-5 text-sm font-semibold text-red-600">{selectedError}</div>
                  ) : (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-primary">
                          ID {selectedDetail?.id || selectedListItem?.id || selectedHadithId}
                        </span>
                        <GradeBadge grade={selectedDetail?.grade || ""} />
                      </div>

                      <h2 className="text-2xl font-black leading-tight text-slate-900 sm:text-3xl">
                        {selectedDetail?.title || selectedListItem?.title || `Hadist #${selectedHadithId}`}
                      </h2>

                      <div className="nft-card space-y-3 p-4 sm:p-5">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Hadist</p>
                        <p className="text-sm font-medium leading-relaxed text-slate-700 sm:text-base">
                          {selectedDetail?.hadeeth || "Teks hadist belum tersedia."}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-border bg-background p-4">
                          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Attribution</p>
                          <p className="mt-2 text-sm font-semibold text-slate-700">
                            {selectedDetail?.attribution || "Tidak ada informasi."}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border bg-background p-4">
                          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Penjelasan</p>
                          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700">
                            {selectedDetail?.explanation || "Belum ada penjelasan."}
                          </p>
                        </div>
                      </div>

                      <div className="nft-card p-4 sm:p-5">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Teks Arab</p>
                        <p className="mt-3 font-arabic text-xl leading-loose text-slate-900 sm:text-2xl" lang="ar" dir="rtl">
                          {selectedDetail?.hadeeth_ar || "النص العربي غير متوفر"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
