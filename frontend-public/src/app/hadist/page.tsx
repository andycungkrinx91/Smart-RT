"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BookOpenText, Loader2, Search } from "lucide-react";

const ITEMS_PER_PAGE = 20;

interface HadithCategory {
  id: number;
  title: string;
  category_id: number;
  jumlah_hadist: number;
}

function parseCategories(payload: unknown): HadithCategory[] {
  const data = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: unknown[] }).data
      : [];

  return data
    .map<HadithCategory | null>((item) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const id = Number(obj.id);
      if (!Number.isFinite(id)) return null;

      return {
        id,
        title: String(obj.title || ""),
        category_id: id, // use id as category_id
        jumlah_hadist: Number(obj.hadeeths_count) || 0,
      };
    })
    .filter((item): item is HadithCategory => item !== null && Boolean(item.title));
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

export default function HadistPage() {
  const [categories, setCategories] = useState<HadithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const cacheKey = "hadist-categories-v1";

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      setLoading(true);
      setError(null);

      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          const list = parseCategories(parsed);
          if (list.length > 0) {
            setCategories(list);
            setLoading(false);
            return;
          }
        }
      } catch {}

      const payload = await fetch("/api/public/hadith/kategori", {
        method: "GET",
        headers: { accept: "application/json" },
        cache: "force-cache",
      })
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null);

      if (cancelled) return;

      const parsed = parseCategories(payload);
      if (parsed.length === 0) {
        setError("Daftar kategori hadist belum dapat dimuat.");
      }

      setCategories(parsed);
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(payload));
      } catch {}
      setLoading(false);
    }

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCategories = useMemo(() => {
    const search = normalizeSearch(query);
    if (!search) return categories;

    return categories.filter((cat) => {
      const haystack = [cat.title, cat.category_id.toString()].join(" ").toLowerCase();
      return haystack.includes(search);
    });
  }, [query, categories]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredCategories.length / ITEMS_PER_PAGE));
  }, [filteredCategories.length]);

  const currentPage = useMemo(() => {
    return Math.min(page, totalPages);
  }, [page, totalPages]);

  const paginatedCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCategories.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, filteredCategories]);

  return (
    <div className="relative overflow-hidden py-14 sm:py-16">
      <div className="ambient-glow top-[-220px] left-[-120px] bg-primary/25" />
      <div className="ambient-glow bottom-[-260px] right-[-140px] bg-brand-accent/15" />

      <div className="container-custom relative z-10 space-y-8">
        <section className="nft-card p-6 sm:p-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-primary">
              <BookOpenText size={14} />
              Koleksi Hadist
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Daftar Kitab Hadist</h1>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-slate-500 sm:text-base">
              Telusuri koleksi hadist Shahih Bukhari, Muslim, dan kitab-kitab lainnya. Pilih kitab untuk melihat daftar hadist.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.35 }}
            className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]"
          >
            <label className="group relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary" size={18} />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari: Bukhari, Muslim, Tirmizi..."
                  className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-focus"
                />
            </label>
            <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 sm:text-sm">
              <span>Tampil</span>
              <span className="text-slate-900">{filteredCategories.length} kitab</span>
            </div>
          </motion.div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="mr-3 h-6 w-6 animate-spin text-primary" />
            <span className="font-semibold">Memuat daftar kitab hadist...</span>
          </div>
        ) : error ? (
          <div className="nft-card p-6 text-sm font-semibold text-red-600">{error}</div>
        ) : filteredCategories.length === 0 ? (
          <div className="nft-card p-6 text-sm font-semibold text-slate-500">Kitab dengan kata kunci tersebut tidak ditemukan.</div>
        ) : (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {paginatedCategories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: Math.min(index * 0.03, 0.18) }}
              >
                <Link
                  href={{
                    pathname: `/hadist/${category.id}`,
                    query: { title: category.title },
                  }}
                  className="nft-card group flex h-full flex-col gap-5 p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-sm font-black text-primary">
                      {category.id}
                    </div>
                    {category.jumlah_hadist ? (
                      <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        {category.jumlah_hadist} hadist
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-900 sm:text-2xl">{category.title}</h2>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-primary transition-transform group-hover:translate-x-1">
                      Lihat Hadist
                      <ArrowRight size={14} />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </section>
        )}

        {totalPages > 1 && !loading && filteredCategories.length > 0 && (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <span className="text-sm font-semibold text-slate-500">
              Halaman {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Selanjutnya
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
