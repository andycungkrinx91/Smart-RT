"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BookOpenText, Loader2, MapPin, Search } from "lucide-react";

import type { AudioMap, SurahSummary } from "@/components/quran/types";

type ApiEnvelope<T> = {
  code?: number;
  message?: string;
  data?: T;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseAudioMap(value: unknown): AudioMap {
  if (!isRecord(value)) return {};

  return Object.entries(value).reduce<AudioMap>((accumulator, [key, raw]) => {
    if (typeof raw === "string" && raw.trim()) {
      accumulator[key] = raw;
    }
    return accumulator;
  }, {});
}

function parseSurahList(payload: unknown) {
  if (!isRecord(payload)) return [];
  const data = (payload as ApiEnvelope<unknown>).data;
  if (!Array.isArray(data)) return [];

  return data
    .map((item) => {
      if (!isRecord(item)) return null;

      const nomor = Number(item.nomor);
      const jumlahAyat = Number(item.jumlahAyat);

      if (!Number.isFinite(nomor) || !Number.isFinite(jumlahAyat)) return null;

      return {
        nomor,
        nama: typeof item.nama === "string" ? item.nama : "",
        namaLatin: typeof item.namaLatin === "string" ? item.namaLatin : "",
        jumlahAyat,
        tempatTurun: typeof item.tempatTurun === "string" ? item.tempatTurun : "-",
        arti: typeof item.arti === "string" ? item.arti : "-",
        deskripsi: typeof item.deskripsi === "string" ? item.deskripsi : "",
        audioFull: parseAudioMap(item.audioFull),
      } satisfies SurahSummary;
    })
    .filter((item): item is SurahSummary => item !== null && Boolean(item.namaLatin));
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

const SURAHS_PER_PAGE = 20;

export default function QuranPage() {
  const [surahList, setSurahList] = useState<SurahSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const cacheKey = "quran-surah-list-v1";

  useEffect(() => {
    let cancelled = false;

    async function loadSurah() {
      setLoading(true);
      setError(null);

      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          const list = parseSurahList(parsed);
          if (list.length > 0) {
            setSurahList(list);
            setLoading(false);
            return;
          }
        }
      } catch {}

      const payload = await fetch("/api/public/quran/surat", {
        method: "GET",
        headers: { accept: "application/json" },
        cache: "force-cache",
      })
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null);

      if (cancelled) return;

      const parsed = parseSurahList(payload);
      if (parsed.length === 0) {
        setError("Daftar surah belum dapat dimuat.");
      }

      setSurahList(parsed);
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(payload));
      } catch {}
      setLoading(false);
    }

    loadSurah();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSurah = useMemo(() => {
    const search = normalizeSearch(query);
    if (!search) return surahList;

    return surahList.filter((surah) => {
      const haystack = [
        surah.nomor.toString(),
        surah.nama,
        surah.namaLatin,
        surah.arti,
        surah.tempatTurun,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [query, surahList]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredSurah.length / SURAHS_PER_PAGE));
  }, [filteredSurah.length]);

  const activePage = useMemo(() => {
    return Math.min(currentPage, totalPages);
  }, [currentPage, totalPages]);

  const paginatedSurah = useMemo(() => {
    const startIndex = (activePage - 1) * SURAHS_PER_PAGE;
    return filteredSurah.slice(startIndex, startIndex + SURAHS_PER_PAGE);
  }, [activePage, filteredSurah]);

  return (
    <div className="relative overflow-hidden py-14 sm:py-16">
      <div className="ambient-glow top-[-220px] left-[-120px] bg-primary/25" />
      <div className="ambient-glow bottom-[-260px] right-[-140px] bg-brand-accent/15" />

      <div className="container-custom relative z-10 space-y-8">
        <section className="nft-card p-6 sm:p-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-primary">
              <BookOpenText size={14} />
              Al Quran Digital
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Daftar Surah Al Quran</h1>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-slate-500 sm:text-base">
              Telusuri 114 surah dengan cepat, cari berdasarkan nama latin, arti, nomor surah, atau lokasi turun.
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
                  setCurrentPage(1);
                }}
                placeholder="Cari: Al-Fatihah, pembukaan, Mekah, 1..."
                className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-focus"
              />
            </label>
            <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 sm:text-sm">
              <span>Tampil</span>
              <span className="text-slate-900">{filteredSurah.length} surah</span>
            </div>
          </motion.div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="mr-3 h-6 w-6 animate-spin text-primary" />
            <span className="font-semibold">Memuat daftar surah...</span>
          </div>
        ) : error ? (
          <div className="nft-card p-6 text-sm font-semibold text-red-600">{error}</div>
        ) : filteredSurah.length === 0 ? (
          <div className="nft-card p-6 text-sm font-semibold text-slate-500">Surah dengan kata kunci tersebut tidak ditemukan.</div>
        ) : (
          <div className="space-y-5">
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {paginatedSurah.map((surah, index) => (
                <motion.div
                  key={surah.nomor}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: Math.min(index * 0.03, 0.18) }}
                >
                  <Link
                    href={`/quran/${surah.nomor}`}
                    className="nft-card group flex h-full flex-col gap-5 p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-sm font-black text-primary">
                        {surah.nomor}
                      </div>
                      <div className="text-right">
                        <p
                          className="font-arabic text-2xl leading-none text-slate-900 sm:text-[1.9rem]"
                          lang="ar"
                          dir="rtl"
                        >
                          {surah.nama}
                        </p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{surah.jumlahAyat} ayat</p>
                      </div>
                    </div>

                    <div>
                      <h2 className="text-xl font-black text-slate-900 sm:text-2xl">{surah.namaLatin}</h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">Arti: {surah.arti}</p>
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        <MapPin size={12} className="text-primary" />
                        {surah.tempatTurun}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-primary transition-transform group-hover:translate-x-1">
                        Buka Surah
                        <ArrowRight size={14} />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </section>

            <div className="nft-card flex flex-col items-center justify-between gap-3 p-4 sm:flex-row">
              <button
                type="button"
                onClick={() => setCurrentPage(Math.max(activePage - 1, 1))}
                disabled={activePage === 1}
                className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-background px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-600 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
              >
                Previous
              </button>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 sm:text-sm">
                Page {activePage} of {totalPages}
              </p>
              <button
                type="button"
                onClick={() => setCurrentPage(Math.min(activePage + 1, totalPages))}
                disabled={activePage === totalPages}
                className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-background px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-600 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
