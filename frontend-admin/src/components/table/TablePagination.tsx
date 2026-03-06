'use client'

type TablePaginationProps = {
  totalItems: number
  currentPage: number
  onPageChange: (page: number) => void
  rowsPerPage?: number
  itemLabel?: string
}

export const DEFAULT_ROWS_PER_PAGE = 20

export function TablePagination({
  totalItems,
  currentPage,
  onPageChange,
  rowsPerPage = DEFAULT_ROWS_PER_PAGE,
  itemLabel = 'data',
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage))
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages)
  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * rowsPerPage + 1
  const endItem = totalItems === 0 ? 0 : Math.min(safeCurrentPage * rowsPerPage, totalItems)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-3">
      <p className="text-xs text-slate-500">
        {totalItems === 0
          ? `Tidak ada ${itemLabel} untuk ditampilkan.`
          : `Menampilkan ${startItem}-${endItem} dari ${totalItems} ${itemLabel}.`}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-corporate border border-border px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1}
        >
          Sebelumnya
        </button>
        <span className="text-xs font-medium text-slate-600">
          Halaman {safeCurrentPage} / {totalPages}
        </span>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-corporate border border-border px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= totalPages}
        >
          Berikutnya
        </button>
      </div>
    </div>
  )
}
