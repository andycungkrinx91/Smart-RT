"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Info,
  Loader2,
  Pause,
  Play,
  ScrollText,
} from "lucide-react";

import { getReciterLabel, sortReciterCodes } from "@/components/quran/reciters";
import TafsirModal from "@/components/quran/TafsirModal";
import type { AudioMap, RelatedSurah, SurahDetail } from "@/components/quran/types";

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

function parseRelatedSurah(value: unknown): RelatedSurah | null {
  if (!isRecord(value)) return null;
  const nomor = Number(value.nomor);
  const jumlahAyat = Number(value.jumlahAyat);
  if (!Number.isFinite(nomor) || !Number.isFinite(jumlahAyat)) return null;

  return {
    nomor,
    jumlahAyat,
    nama: typeof value.nama === "string" ? value.nama : "",
    namaLatin: typeof value.namaLatin === "string" ? value.namaLatin : "",
  };
}

function parseSurahDetail(payload: unknown): SurahDetail | null {
  if (!isRecord(payload)) return null;
  const data = (payload as ApiEnvelope<unknown>).data;
  if (!isRecord(data)) return null;

  const nomor = Number(data.nomor);
  const jumlahAyat = Number(data.jumlahAyat);
  if (!Number.isFinite(nomor) || !Number.isFinite(jumlahAyat)) return null;

  const ayat = Array.isArray(data.ayat)
    ? data.ayat
        .map((item) => {
          if (!isRecord(item)) return null;

          const nomorAyat = Number(item.nomorAyat);
          if (!Number.isFinite(nomorAyat)) return null;

          return {
            nomorAyat,
            teksArab: typeof item.teksArab === "string" ? item.teksArab : "",
            teksLatin: typeof item.teksLatin === "string" ? item.teksLatin : "",
            teksIndonesia: typeof item.teksIndonesia === "string" ? item.teksIndonesia : "",
            audio: parseAudioMap(item.audio),
          };
        })
        .filter((item): item is SurahDetail["ayat"][number] => item !== null)
    : [];

  return {
    nomor,
    nama: typeof data.nama === "string" ? data.nama : "",
    namaLatin: typeof data.namaLatin === "string" ? data.namaLatin : "",
    jumlahAyat,
    tempatTurun: typeof data.tempatTurun === "string" ? data.tempatTurun : "-",
    arti: typeof data.arti === "string" ? data.arti : "-",
    deskripsi: typeof data.deskripsi === "string" ? data.deskripsi : "",
    audioFull: parseAudioMap(data.audioFull),
    ayat,
    suratSebelumnya: parseRelatedSurah(data.suratSebelumnya),
    suratSelanjutnya: parseRelatedSurah(data.suratSelanjutnya),
  };
}

function parseTafsirMap(payload: unknown) {
  if (!isRecord(payload)) return {};
  const data = (payload as ApiEnvelope<unknown>).data;
  if (!isRecord(data) || !Array.isArray(data.tafsir)) return {};

  return data.tafsir.reduce<Record<number, string>>((accumulator, item) => {
    if (!isRecord(item)) return accumulator;

    const ayat = Number(item.ayat);
    const teks = typeof item.teks === "string" ? item.teks.trim() : "";
    if (!Number.isFinite(ayat) || !teks) return accumulator;

    accumulator[ayat] = teks;
    return accumulator;
  }, {});
}

function stripHtmlTags(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function collectReciterCodes(detail: SurahDetail) {
  const codes = new Set<string>();
  Object.entries(detail.audioFull).forEach(([code, url]) => {
    if (url) codes.add(code);
  });

  detail.ayat.slice(0, 8).forEach((ayatItem) => {
    Object.entries(ayatItem.audio).forEach(([code, url]) => {
      if (url) codes.add(code);
    });
  });

  return sortReciterCodes([...codes]);
}

export default function SurahDetailPage() {
  const params = useParams();
  const nomorParamRaw = params.nomor;
  const nomorParam = typeof nomorParamRaw === "string" ? nomorParamRaw : Array.isArray(nomorParamRaw) ? nomorParamRaw[0] : "";

  const [detail, setDetail] = useState<SurahDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedReciter, setSelectedReciter] = useState("");
  const [currentAudioKey, setCurrentAudioKey] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const [openAyahNumber, setOpenAyahNumber] = useState<number | null>(null);
  const [tafsirByAyah, setTafsirByAyah] = useState<Record<number, string>>({});
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const [tafsirLoaded, setTafsirLoaded] = useState(false);
  const [tafsirError, setTafsirError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSurah() {
      if (!nomorParam) {
        setError("Nomor surah tidak valid.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setCurrentAudioKey(null);
      setIsPlaying(false);
      setAudioError(null);
      setOpenAyahNumber(null);
      setTafsirByAyah({});
      setTafsirLoaded(false);
      setTafsirError(null);

      const cacheKey = `quran-surah-detail-${nomorParam}`;

      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsedCached = JSON.parse(cached);
          const parsed = parseSurahDetail(parsedCached);
          if (parsed) {
            setDetail(parsed);
            const codes = collectReciterCodes(parsed);
            setSelectedReciter((previous) => (codes.includes(previous) ? previous : codes[0] ?? ""));
            setLoading(false);
            return;
          }
        }
      } catch {}

      const payload = await fetch(`/api/public/quran/surat/${encodeURIComponent(nomorParam)}`, {
        method: "GET",
        headers: { accept: "application/json" },
        cache: "force-cache",
      })
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null);

      if (cancelled) return;

      const parsed = parseSurahDetail(payload);
      if (!parsed) {
        setDetail(null);
        setError("Detail surah tidak ditemukan.");
        setSelectedReciter("");
      } else {
        setDetail(parsed);
        const codes = collectReciterCodes(parsed);
        setSelectedReciter((previous) => (codes.includes(previous) ? previous : codes[0] ?? ""));
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(payload));
        } catch {}
      }

      setLoading(false);
    }

    loadSurah();
    return () => {
      cancelled = true;
    };
  }, [nomorParam]);

  const reciterCodes = useMemo(() => {
    if (!detail) return [];
    return collectReciterCodes(detail);
  }, [detail]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (!audio) return;
      audio.pause();
      audio.src = "";
    };
  }, []);

  const handleReciterChange = useCallback((nextReciter: string) => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setCurrentAudioKey(null);
    setIsPlaying(false);
    setAudioError(null);
    setSelectedReciter(nextReciter);
  }, []);

  const toggleAudio = useCallback(
    async (audioUrl: string | undefined, audioKey: string) => {
      const audio = audioRef.current;
      if (!audio || !audioUrl) return;

      setAudioError(null);

      if (currentAudioKey === audioKey) {
        if (audio.paused) {
          setAudioBusy(true);
          try {
            await audio.play();
          } catch {
            setAudioError("Audio belum dapat diputar. Coba beberapa detik lagi.");
          }
          setAudioBusy(false);
        } else {
          audio.pause();
        }
        return;
      }

      audio.pause();
      audio.src = audioUrl;
      audio.load();

      setCurrentAudioKey(audioKey);
      setAudioBusy(true);

      try {
        await audio.play();
      } catch {
        setCurrentAudioKey(null);
        setAudioError("Audio belum dapat diputar. Coba beberapa detik lagi.");
      }

      setAudioBusy(false);
    },
    [currentAudioKey],
  );

  const loadTafsir = useCallback(async () => {
    if (!detail || tafsirLoading || tafsirLoaded) return;

    setTafsirLoading(true);
    setTafsirError(null);

    const cacheKey = `quran-tafsir-${detail.nomor}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsedCached = JSON.parse(cached);
        const parsed = parseTafsirMap(parsedCached);
        if (Object.keys(parsed).length > 0) {
          setTafsirByAyah(parsed);
          setTafsirLoaded(true);
          setTafsirLoading(false);
          return;
        }
      }
    } catch {}

    const payload = await fetch(`/api/public/quran/tafsir/${detail.nomor}`, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "force-cache",
    })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);

    const parsed = parseTafsirMap(payload);
    if (Object.keys(parsed).length === 0) {
      setTafsirError("Tafsir belum tersedia untuk surah ini.");
    }

    setTafsirByAyah(parsed);
    setTafsirLoaded(true);
    setTafsirLoading(false);
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(payload));
    } catch {}
  }, [detail, tafsirLoaded, tafsirLoading]);

  const handleOpenTafsir = useCallback(
    (ayahNumber: number) => {
      setOpenAyahNumber(ayahNumber);
      if (!tafsirLoaded && !tafsirLoading) {
        void loadTafsir();
      }
    },
    [loadTafsir, tafsirLoaded, tafsirLoading],
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-500">
        <Loader2 className="mr-3 h-6 w-6 animate-spin text-primary" />
        <span className="font-semibold">Memuat detail surah...</span>
      </div>
    );
  }

  if (!detail || error) {
    return (
      <div className="container-custom py-16">
        <div className="nft-card p-6">
          <Link href="/quran" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-primary">
            <ArrowLeft size={14} />
            Kembali ke daftar surah
          </Link>
          <p className="mt-4 text-sm font-semibold text-red-600">{error || "Detail surah tidak ditemukan."}</p>
        </div>
      </div>
    );
  }

  const surahAudioUrl = selectedReciter ? detail.audioFull[selectedReciter] : undefined;
  const activeTafsir = openAyahNumber ? tafsirByAyah[openAyahNumber] ?? null : null;
  const shortDescription = stripHtmlTags(detail.deskripsi);

  return (
    <div className="relative overflow-hidden py-12 sm:py-14">
      <div className="ambient-glow top-[-220px] right-[-140px] bg-primary/20" />

      <div className="container-custom relative z-10 space-y-7">
        <section className="nft-card p-5 sm:p-7">
          <Link href="/quran" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-primary">
            <ArrowLeft size={14} />
            Kembali ke daftar surah
          </Link>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Surah #{detail.nomor}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{detail.namaLatin}</h1>
              <p className="mt-1 text-2xl leading-none text-slate-900">{detail.nama}</p>
              <p className="mt-3 text-sm font-semibold text-slate-500">
                {detail.arti} - {detail.tempatTurun} - {detail.jumlahAyat} ayat
              </p>
            </div>

            <div className="w-full max-w-md space-y-3 rounded-xl border border-border bg-background p-4">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                <Headphones size={14} className="text-primary" />
                Audio Surah
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                <select
                  value={selectedReciter}
                  onChange={(event) => handleReciterChange(event.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-focus"
                >
                  {reciterCodes.map((code) => (
                    <option key={code} value={code}>
                      {getReciterLabel(code)}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => void toggleAudio(surahAudioUrl, "surah")}
                  disabled={!surahAudioUrl || !selectedReciter}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {audioBusy && currentAudioKey === "surah" ? <Loader2 className="h-4 w-4 animate-spin" /> : currentAudioKey === "surah" && isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  {currentAudioKey === "surah" && isPlaying ? "Pause Surah" : "Putar Surah"}
                </button>
              </div>
              <p className="text-xs font-semibold text-slate-500">Pilih qari lalu putar audio penuh surah atau audio per ayat.</p>
            </div>
          </div>

          {shortDescription ? (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm text-slate-600">
              <Info size={16} className="mt-0.5 shrink-0 text-primary" />
              <p className="leading-relaxed">{shortDescription}</p>
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              {detail.suratSebelumnya ? (
                <Link
                  href={`/quran/${detail.suratSebelumnya.nomor}`}
                  className="inline-flex w-full items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary"
                >
                  <ChevronLeft size={18} />
                  {detail.suratSebelumnya.namaLatin}
                </Link>
              ) : (
                <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-slate-400">Awal Al Quran</div>
              )}
            </div>
            <div className="text-right">
              {detail.suratSelanjutnya ? (
                <Link
                  href={`/quran/${detail.suratSelanjutnya.nomor}`}
                  className="inline-flex w-full items-center justify-end gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary"
                >
                  {detail.suratSelanjutnya.namaLatin}
                  <ChevronRight size={18} />
                </Link>
              ) : (
                <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-slate-400">Akhir Al Quran</div>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black text-slate-900">Daftar Ayat</h2>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              <ScrollText size={14} className="text-primary" />
              Klik ayat untuk baca tafsir
            </p>
          </div>

          {detail.ayat.map((ayah, index) => {
            const audioKey = `ayah-${ayah.nomorAyat}`;
            const audioUrl = selectedReciter ? ayah.audio[selectedReciter] : undefined;
            const active = currentAudioKey === audioKey;
            const highlighted = openAyahNumber === ayah.nomorAyat;

            return (
              <motion.article
                key={ayah.nomorAyat}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index * 0.015, 0.2) }}
                role="button"
                tabIndex={0}
                onClick={() => handleOpenTafsir(ayah.nomorAyat)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleOpenTafsir(ayah.nomorAyat);
                  }
                }}
                className={`nft-card cursor-pointer p-4 transition hover:border-primary/40 sm:p-5 ${highlighted ? "border-primary/50 ring-2 ring-primary/20" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-black text-primary">
                    {ayah.nomorAyat}
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void toggleAudio(audioUrl, audioKey);
                    }}
                    disabled={!audioUrl || !selectedReciter}
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-600 transition hover:border-primary/35 hover:text-primary disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {audioBusy && active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : active && isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    {active && isPlaying ? "Pause" : "Play"}
                  </button>
                </div>

                <p
                  className="font-arabic mt-4 text-right text-[1.9rem] leading-[2.1] text-slate-900 sm:text-[2.1rem]"
                  lang="ar"
                  dir="rtl"
                >
                  {ayah.teksArab}
                </p>

                {ayah.teksLatin ? <p className="mt-4 text-sm italic leading-relaxed text-slate-600">{ayah.teksLatin}</p> : null}

                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700">{ayah.teksIndonesia}</p>
              </motion.article>
            );
          })}
        </section>

        {audioError ? <div className="nft-card p-4 text-sm font-semibold text-red-600">{audioError}</div> : null}

        <p className="text-xs font-semibold text-slate-500">Sumber data: EQuran.id</p>
      </div>

      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentAudioKey(null);
        }}
        onError={() => {
          setAudioError("Audio belum dapat diputar. Coba beberapa detik lagi.");
          setIsPlaying(false);
        }}
      />

      <TafsirModal
        open={openAyahNumber !== null}
        onClose={() => setOpenAyahNumber(null)}
        ayahNumber={openAyahNumber}
        surahName={`${detail.namaLatin} (${detail.nama})`}
        content={activeTafsir}
        loading={tafsirLoading}
        error={tafsirError}
      />
    </div>
  );
}
