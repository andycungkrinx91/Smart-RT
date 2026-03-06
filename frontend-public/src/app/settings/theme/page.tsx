"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ChevronLeft } from "lucide-react";

import { DEFAULT_THEME_COLOR, THEME_COLORS, applyThemeColor, getStoredThemeColor, setStoredThemeColor } from "@/lib/theme";

export default function ThemeSettingsPage() {
  const [current, setCurrent] = useState<string>(() => getStoredThemeColor() ?? DEFAULT_THEME_COLOR);

  useEffect(() => {
    applyThemeColor(current);
  }, [current]);

  return (
    <div className="py-16">
      <div className="container-custom">
        <div className="flex items-center gap-3 mb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary">
            <ChevronLeft size={18} />
            Kembali
          </Link>
          <h1 className="text-2xl font-black text-slate-900">Tema</h1>
        </div>

        <div className="nft-card p-6">
          <p className="text-sm text-slate-500 font-semibold mb-4">Pilih warna utama</p>
          <div className="grid grid-cols-6 sm:grid-cols-10 gap-3">
            {THEME_COLORS.map((color) => {
              const active = current.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setCurrent(setStoredThemeColor(color));
                  }}
                  className={`relative h-10 w-10 rounded-full border transition ${active ? "border-slate-900" : "border-border"}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Theme color ${color}`}
                >
                  {active && (
                    <span className="absolute inset-0 grid place-items-center text-white">
                      <Check size={18} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
