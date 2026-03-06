export const RECITER_LABELS: Record<string, string> = {
  '01': 'Abdullah Al-Juhany',
  '02': 'Abdul Muhsin Al-Qasim',
  '03': 'Abdurrahman As-Sudais',
  '04': 'Ibrahim Al-Dossari',
  '05': 'Misyari Rasyid Al-Afasi',
  '06': 'Yasser Al-Dosari',
}

const RECITER_ORDER = ['05', '03', '01', '02', '04', '06']

export function getReciterLabel(code: string) {
  return RECITER_LABELS[code] ?? `Qari ${code}`
}

export function sortReciterCodes(codes: string[]) {
  return [...codes].sort((a, b) => {
    const aIndex = RECITER_ORDER.indexOf(a)
    const bIndex = RECITER_ORDER.indexOf(b)
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b)
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })
}
