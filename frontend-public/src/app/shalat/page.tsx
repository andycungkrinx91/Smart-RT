"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, Calendar } from "lucide-react";

type ApiOk<T> = { code: number; message: string; data: T };

type JadwalItem = {
  tanggal: number;
  tanggal_lengkap: string;
  hari: string;
  imsak: string;
  subuh: string;
  terbit: string;
  dhuha: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
};

type JadwalResponse = ApiOk<{
  provinsi: string;
  kabkota: string;
  bulan: number;
  tahun: number;
  bulan_nama: string;
  jadwal: JadwalItem[];
}>;

const CACHE_KEY = "shalat-cache-v1";

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function normalizeStringList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  const values = input
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (!item || typeof item !== "object") return "";

      const record = item as Record<string, unknown>;
      const candidate =
        record.name ??
        record.label ??
        record.nama ??
        record.provinsi ??
        record.kabkota ??
        record.value;

      return typeof candidate === "string" ? candidate.trim() : "";
    })
    .filter((value): value is string => value.length > 0);

  return Array.from(new Set(values));
}

export default function ShalatPage() {
  const now = useMemo(() => new Date(), []);
  const [provinsiList, setProvinsiList] = useState<string[]>([]);
  const [kabkotaList, setKabkotaList] = useState<string[]>([]);

  const [provinsi, setProvinsi] = useState<string>("");
  const [kabkota, setKabkota] = useState<string>("");
  const [bulan, setBulan] = useState<number>(now.getMonth() + 1);
  const [tahun, setTahun] = useState<number>(now.getFullYear());

  const [loadingProv, setLoadingProv] = useState(true);
  const [loadingKab, setLoadingKab] = useState(false);
  const [loadingJadwal, setLoadingJadwal] = useState(false);
  const [errorProv, setErrorProv] = useState<string | null>(null);
  const [errorKab, setErrorKab] = useState<string | null>(null);
  const [jadwal, setJadwal] = useState<JadwalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadProv() {
      setLoadingProv(true);
      setErrorProv(null);

      try {
        const cached = sessionStorage.getItem(`${CACHE_KEY}:provinsi`);
        if (cached) {
          const parsed = normalizeStringList(JSON.parse(cached));
          if (parsed.length > 0) {
            if (cancelled) return;
            setProvinsiList(parsed);
            setProvinsi(parsed.includes("DKI Jakarta") ? "DKI Jakarta" : parsed[0] || "");
            setLoadingProv(false);
            return;
          }
        }
      } catch {}

      try {
        const res = await fetch("/api/public/shalat/provinsi", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        if (cancelled) return;
        const list = normalizeStringList(json?.data);
        if (list.length > 0) {
          setProvinsiList(list);
          setProvinsi(list.includes("DKI Jakarta") ? "DKI Jakarta" : list[0]);
          try {
            sessionStorage.setItem(`${CACHE_KEY}:provinsi`, JSON.stringify(list));
          } catch {}
        } else {
          setErrorProv("Data provinsi tidak tersedia");
        }
      } catch (e) {
        if (!cancelled) setErrorProv("Gagal memuat provinsi");
      } finally {
        if (!cancelled) setLoadingProv(false);
      }
    }

    loadProv();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadKab() {
      if (!provinsi) {
        setKabkota("");
        setKabkotaList([]);
        setLoadingKab(false);
        return;
      }

      setLoadingKab(true);
      setErrorKab(null);
      setKabkota("");
      setKabkotaList([]);
      setJadwal(null);
      const cacheId = `${CACHE_KEY}:kabkota:${provinsi}`;

      try {
        const cached = sessionStorage.getItem(cacheId);
        if (cached) {
          const parsed = normalizeStringList(JSON.parse(cached));
          if (parsed.length > 0) {
            if (cancelled) return;
            setKabkotaList(parsed);
            setKabkota(parsed.find((x) => x.toLowerCase().includes("jakarta")) || parsed[0]);
            setLoadingKab(false);
            return;
          }
        }
      } catch {}

      try {
        const res = await fetch(`/api/public/shalat/kabkota?provinsi=${encodeURIComponent(provinsi)}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        if (cancelled) return;
        const list = normalizeStringList(json?.data);
        if (list.length > 0) {
          setKabkotaList(list);
          setKabkota(list.find((x) => x.toLowerCase().includes("jakarta")) || list[0]);
          try {
            sessionStorage.setItem(cacheId, JSON.stringify(list));
          } catch {}
        } else {
          setErrorKab("Data kota tidak tersedia");
        }
      } catch (e) {
        if (!cancelled) setErrorKab("Gagal memuat kota");
      } finally {
        if (!cancelled) setLoadingKab(false);
      }
    }

    loadKab();
    return () => {
      cancelled = true;
    };
  }, [provinsi]);

  useEffect(() => {
    let cancelled = false;

    async function loadJadwal() {
      if (!provinsi || !kabkota) {
        setJadwal(null);
        setError(null);
        setLoadingJadwal(false);
        return;
      }

      setLoadingJadwal(true);
      setError(null);
      const url = `/api/public/shalat?provinsi=${encodeURIComponent(provinsi)}&kabkota=${encodeURIComponent(kabkota)}&bulan=${bulan}&tahun=${tahun}`;
      const cacheId = `${CACHE_KEY}:jadwal:${provinsi}:${kabkota}:${bulan}:${tahun}`;

      try {
        const cached = sessionStorage.getItem(cacheId);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === "object" && (parsed as any).code === 200) {
            setJadwal(parsed as JadwalResponse);
            setLoadingJadwal(false);
            return;
          }
        }
      } catch {}

      try {
        const res = await fetch(url, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);

        if (cancelled) return;

        if (!res || typeof res !== "object" || (res as any).code !== 200) {
          setError("Gagal memuat jadwal shalat.");
          setJadwal(null);
          return;
        }

        setJadwal(res as JadwalResponse);
        try {
          sessionStorage.setItem(cacheId, JSON.stringify(res));
        } catch {}
      } catch {
        if (!cancelled) {
          setError("Gagal memuat jadwal shalat.");
          setJadwal(null);
        }
      } finally {
        if (!cancelled) setLoadingJadwal(false);
      }
    }

    loadJadwal();
    return () => {
      cancelled = true;
    };
  }, [provinsi, kabkota, bulan, tahun]);

  return (
    <div className="py-16">
      <div className="container-custom">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Jadwal Shalat</h1>
          <p className="mt-3 text-slate-500 font-medium">
            Lihat jadwal shalat bulanan untuk wilayah Anda. Pilih provinsi, kabupaten/kota, dan bulan.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="nft-card p-4 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <MapPin size={18} className="text-primary" />
              Lokasi
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Provinsi</label>
                <select
                  value={provinsi}
                  onChange={(e) => setProvinsi(e.target.value)}
                  className="min-h-12 w-full rounded-corporate border border-border bg-background px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-primary sm:text-base"
                  disabled={loadingProv}
                >
                  {loadingProv ? <option value="">Loading...</option> : null}
                  {!loadingProv && errorProv ? <option value="">{errorProv}</option> : null}
                  {!loadingProv && !errorProv && provinsiList.length === 0 ? <option value="">Tidak ada data</option> : null}
                  {provinsiList.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Kab/Kota</label>
                <select
                  value={kabkota}
                  onChange={(e) => setKabkota(e.target.value)}
                  className="min-h-12 w-full rounded-corporate border border-border bg-background px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 sm:text-base"
                  disabled={loadingKab || !provinsi}
                >
                  {!kabkota && !loadingKab ? <option value="">-- Pilih Kabupaten/Kota --</option> : null}
                  {loadingKab ? <option value="">Loading...</option> : null}
                  {errorKab ? <option value="">{errorKab}</option> : null}
                  {!loadingKab && !errorKab && kabkotaList.length === 0 && provinsi ? <option value="">Tidak ada data</option> : null}
                  {kabkotaList.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="nft-card p-4 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <Calendar size={18} className="text-primary" />
              Periode
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Bulan</label>
                <select
                  value={bulan}
                  onChange={(e) => setBulan(Number(e.target.value))}
                  className="w-full rounded-corporate border border-border bg-background px-3 py-3 text-sm sm:text-base text-slate-700 font-semibold outline-none focus:ring-2 focus:ring-primary"
                  style={{ minHeight: '48px' }}
                >
                  {MONTHS.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Tahun</label>
                <input
                  value={tahun}
                  onChange={(e) => setTahun(Number(e.target.value))}
                  inputMode="numeric"
                  className="w-full rounded-corporate border border-border bg-background px-3 py-3 text-sm sm:text-base text-slate-700 font-semibold outline-none focus:ring-2 focus:ring-primary"
                  style={{ minHeight: '48px' }}
                />
              </div>
            </div>
          </div>

          <div className="nft-card p-6">
            <div className="text-sm font-black text-slate-900">Status</div>
            <div className="mt-5">
              {loadingJadwal ? (
                <div className="flex items-center gap-3 text-slate-500 font-semibold">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Memuat jadwal...
                </div>
              ) : error ? (
                <div className="text-red-600 font-semibold">{error}</div>
              ) : jadwal ? (
                <div>
                  <div className="text-slate-900 font-black">{jadwal.data.kabkota}</div>
                  <div className="text-slate-500 font-semibold">{jadwal.data.provinsi}</div>
                  <div className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                    {jadwal.data.bulan_nama} {jadwal.data.tahun}
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 font-semibold">Pilih lokasi untuk melihat jadwal.</div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 nft-card p-0">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-border">
                  {[
                    "Tanggal",
                    "Imsak",
                    "Subuh",
                    "Terbit",
                    "Dhuha",
                    "Dzuhur",
                    "Ashar",
                    "Maghrib",
                    "Isya",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(jadwal?.data.jadwal || []).map((row) => (
                  <tr key={row.tanggal_lengkap} className="border-b border-border/60 hover:bg-background">
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {row.hari}, {row.tanggal}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{row.imsak}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{row.subuh}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{row.terbit}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{row.dhuha}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{row.dzuhur}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{row.ashar}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{row.maghrib}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{row.isya}</td>
                  </tr>
                ))}

                {!loadingJadwal && (jadwal?.data.jadwal || []).length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-500 font-semibold">
                      Tidak ada data.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-6 text-xs font-semibold text-slate-500">
          Sumber data: Bimas Islam Kementerian Agama RI (via EQuran.id)
        </p>
      </div>
    </div>
  );
}
