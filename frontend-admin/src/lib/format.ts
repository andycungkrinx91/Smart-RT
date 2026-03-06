/**
 * Formats a number as Indonesian Rupiah (IDR).
 * 
 * @param value - The numeric value to format
 * @returns A string formatted as currency (e.g., "Rp 50.000")
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Formats a date string into a medium date format (id-ID).
 * 
 * @param value - The date string to format
 * @returns A formatted date string (e.g., "27 Feb 2026")
 */
export function formatDate(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(parsed)
}

/**
 * Formats a period string (YYYY-MM) into a long month and year format.
 * 
 * @param period - The period string in YYYY-MM format
 * @returns A formatted period string (e.g., "Februari 2026")
 */
export function formatPeriod(period: string): string {
  const [year, month] = period.split('-')
  const parsedYear = Number(year)
  const parsedMonth = Number(month)

  if (!parsedYear || !parsedMonth || parsedMonth < 1 || parsedMonth > 12) {
    return period
  }

  const date = new Date(Date.UTC(parsedYear, parsedMonth - 1, 1))
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
}
