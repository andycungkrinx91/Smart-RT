"use client";

import { useEffect, useMemo, useState } from "react";

type PrayerTimesPayload = {
  city: string;
  country: string;
  timezone: string;
  timings: {
    fajr: string | null;
    sunrise: string | null;
    dhuhr: string | null;
    asr: string | null;
    maghrib: string | null;
    isha: string | null;
  };
};

const ORDER: Array<{ key: keyof PrayerTimesPayload["timings"]; label: string }> = [
  { key: "fajr", label: "Subuh" },
  { key: "dhuhr", label: "Dzuhur" },
  { key: "asr", label: "Ashar" },
  { key: "maghrib", label: "Maghrib" },
  { key: "isha", label: "Isya" },
];

function parseHm(value: string) {
  const m = value.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
}

function nowMinutesJakarta() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const h = Number(map.hour ?? "0");
  const m = Number(map.minute ?? "0");
  return h * 60 + m;
}

export default function PrayerTimesBar() {
  const [data, setData] = useState<PrayerTimesPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/public/prayer-times", { method: "GET" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (!cancelled) setData(res);
    }
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const next = useMemo(() => {
    if (!data) return null;
    const now = nowMinutesJakarta();

    const entries = ORDER.map((o) => {
      const t = data.timings[o.key];
      const mins = t ? parseHm(t) : null;
      return { ...o, time: t, mins };
    }).filter((e) => e.time && e.mins !== null) as Array<{ key: string; label: string; time: string; mins: number }>;

    for (const e of entries) {
      if (e.mins >= now) return e;
    }
    return entries[0] ?? null;
  }, [data]);

  if (!data || !next) return null;

  return (
    <div className="hidden lg:flex items-center gap-3 rounded-full border border-border bg-background px-4 py-2 text-sm shadow-sm">
      <span className="font-semibold text-slate-500">Waktu shalat</span>
      <span className="h-4 w-px bg-border" aria-hidden />
      <span className="font-black text-slate-900">{next.label}</span>
      <span className="font-semibold text-slate-500">{next.time}</span>
      <span className="h-4 w-px bg-border" aria-hidden />
      <span className="text-xs font-semibold text-slate-500 truncate max-w-[10rem]">{data.city}</span>
    </div>
  );
}
