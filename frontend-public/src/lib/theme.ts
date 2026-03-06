export const THEME_STORAGE_KEY = 'smart-rt-theme-color'

export const THEME_COLORS = [
  '#32de84',
  '#720e9e',
  '#febe10',
  '#ffff00',
  '#f0e68c',
  '#6495ed',
  '#7b68ee',
  '#1e90ff',
  '#87cefa',
  '#00ced1',
  '#1ca9c9',
  '#6a5acd',
  '#e44d2e',
  '#e25822',
  '#ff6b6b',
  '#ff9f43',
  '#ff4757',
  '#ffa502',
  '#2ed573',
  '#1dd1a1',
  '#0097e6',
  '#00d2d3',
  '#48dbfb',
  '#5352ed',
  '#3742fa',
  '#a29bfe',
  '#eccc68',
  '#fd9644',
  '#778ca3',
  '#2f3542',
] as const

export const DEFAULT_THEME_COLOR = '#1e90ff'

const THEME_COLOR_SET = new Set<string>(THEME_COLORS)

function normalizeThemeColor(color: string) {
  return color.trim().toLowerCase()
}

function sanitizeThemeColor(color: string | null | undefined) {
  if (!color) {
    return null
  }

  const normalized = normalizeThemeColor(color)
  return THEME_COLOR_SET.has(normalized) ? normalized : null
}

export function getStoredThemeColor() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return sanitizeThemeColor(window.localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return null
  }
}

export function applyThemeColor(color: string) {
  const resolvedColor = sanitizeThemeColor(color) ?? DEFAULT_THEME_COLOR

  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--color-brand', resolvedColor)
    document.documentElement.dataset.themeColor = resolvedColor
  }

  return resolvedColor
}

export function setStoredThemeColor(color: string) {
  const resolvedColor = applyThemeColor(color)

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, resolvedColor)
    } catch {}
  }

  return resolvedColor
}
