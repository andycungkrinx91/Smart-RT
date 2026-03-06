'use client'

import { useCallback, useState } from 'react'
import { DEFAULT_THEME_COLOR, getStoredThemeColor, setStoredThemeColor } from '@/lib/theme'

export function useThemeColor() {
  const [themeColor, setThemeColorState] = useState(() => getStoredThemeColor() ?? DEFAULT_THEME_COLOR)

  const setThemeColor = useCallback((color: string) => {
    setThemeColorState(setStoredThemeColor(color))
  }, [])

  return {
    themeColor,
    setThemeColor,
  }
}
