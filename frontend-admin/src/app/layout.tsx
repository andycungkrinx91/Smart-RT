import './globals.css'
import type { Metadata } from 'next'
import Script from 'next/script'
import { DEFAULT_THEME_COLOR, THEME_COLORS, THEME_STORAGE_KEY } from '@/lib/theme'

export const metadata: Metadata = {
  title: 'Smart-RT Admin',
  description: 'Admin dashboard Smart-RT',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
}

const themeInitScript = `(() => {
  try {
    const key = ${JSON.stringify(THEME_STORAGE_KEY)};
    const fallback = ${JSON.stringify(DEFAULT_THEME_COLOR)};
    const allowed = new Set(${JSON.stringify(THEME_COLORS.map((color) => color.toLowerCase()))});
    const raw = localStorage.getItem(key);
    const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    const color = allowed.has(value) ? value : fallback;
    document.documentElement.style.setProperty('--color-brand', color);
    document.documentElement.dataset.themeColor = color;
  } catch {
    document.documentElement.style.setProperty('--color-brand', ${JSON.stringify(DEFAULT_THEME_COLOR)});
  }
})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        {children}
      </body>
    </html>
  )
}
