import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Noto_Naskh_Arabic } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import { DEFAULT_THEME_COLOR, THEME_COLORS, THEME_STORAGE_KEY } from "@/lib/theme";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const notoNaskhArabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Smart RT - Solusi Digital Manajemen Lingkungan",
  description: "Platform manajemen RT modern untuk transparansi dan kemudahan warga.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

const themeInitScript = `(() => {
  try {
    const key = ${JSON.stringify(THEME_STORAGE_KEY)};
    const fallback = ${JSON.stringify(DEFAULT_THEME_COLOR)};
    const allowed = new Set(${JSON.stringify(THEME_COLORS.map((c) => c.toLowerCase()))});
    const raw = localStorage.getItem(key);
    const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    const color = allowed.has(value) ? value : fallback;
    document.documentElement.style.setProperty('--color-brand', color);
    document.documentElement.dataset.themeColor = color;
  } catch {
    document.documentElement.style.setProperty('--color-brand', ${JSON.stringify(DEFAULT_THEME_COLOR)});
  }
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} ${notoNaskhArabic.variable} font-sans`}>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <Navbar />
        <main className="min-h-screen overflow-x-hidden pt-0 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pt-[calc(var(--header-h)-25em)] lg:pb-0">
          {children}
        </main>
        <Footer />
        <BottomNav />
      </body>
    </html>
  );
}
