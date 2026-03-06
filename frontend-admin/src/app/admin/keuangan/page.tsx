'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Eye, Plus, SquarePen as Edit, Trash2 as Trash, X } from 'lucide-react'
import { DEFAULT_ROWS_PER_PAGE, TablePagination } from '@/components/table/TablePagination'
import { fetchWithAuth } from '@/lib/client-api'
import { getUserFriendlyApiError, toUserFriendlyMessage } from '@/lib/user-friendly-error'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDate } from '@/lib/format'

type KeuanganJenis = 'pemasukan' | 'pengeluaran'

type KeuanganItem = {
  id: number
  tanggal: string
  jenis: KeuanganJenis
  kategori: string
  keterangan: string | null
  jumlah: number
  created_at: string
}

type LedgerRow = KeuanganItem & {
  refNo: string
  cashIn: number
  cashOut: number
  balance: number
}

type KeuanganForm = {
  tanggal: string
  jenis: KeuanganJenis
  kategori: string
  jumlah: string
  keterangan: string
}

type SortOrder = 'asc' | 'desc'

type SortConfig = {
  key: string
  order: SortOrder
}

const emptyForm: KeuanganForm = {
  tanggal: '',
  jenis: 'pemasukan',
  kategori: '',
  jumlah: '',
  keterangan: '',
}

const ROWS_PER_PAGE = DEFAULT_ROWS_PER_PAGE

function sortByDateAndId(items: KeuanganItem[]) {
  return [...items].sort((a, b) => {
    const aTime = Date.parse(a.tanggal)
    const bTime = Date.parse(b.tanggal)

    if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) {
      return aTime - bTime
    }

    return a.id - b.id
  })
}

function toForm(item: KeuanganItem): KeuanganForm {
  return {
    tanggal: item.tanggal.slice(0, 10),
    jenis: item.jenis,
    kategori: item.kategori,
    jumlah: String(item.jumlah),
    keterangan: item.keterangan ?? '',
  }
}

function getCurrentMonthValue() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function SortIcon({ columnKey, sortConfig }: { columnKey: string; sortConfig: SortConfig }) {
  if (sortConfig.key !== columnKey) {
    return <ChevronDown className="ml-1 inline h-3 w-3 opacity-30" aria-hidden="true" />
  }
  if (sortConfig.order === 'asc') {
    return <ChevronUp className="ml-1 inline h-3 w-3 text-primary" aria-hidden="true" />
  }
  return <ChevronDown className="ml-1 inline h-3 w-3 text-primary" aria-hidden="true" />
}

export default function KeuanganPage() {
  const [items, setItems] = useState<KeuanganItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [formErrorMessage, setFormErrorMessage] = useState('')

  // ── Toast system ──────────────────────────────────────────────────────────
  const { toasts, showToast, dismissToast } = useToast()

  // ── Confirm-delete modal state ────────────────────────────────────────────
  const [confirmTarget, setConfirmTarget] = useState<KeuanganItem | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  // ── Period filter state (single month input) ──────────────────────────────
  const [selectedPeriod, setSelectedPeriod] = useState<string>(getCurrentMonthValue())

  // ── Sort state ────────────────────────────────────────────────────────────
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id', order: 'desc' })

  const [selectedItem, setSelectedItem] = useState<KeuanganItem | null>(null)
  const [modalMode, setModalMode] = useState<'add' | 'view' | 'edit' | null>(null)
  const [form, setForm] = useState<KeuanganForm>(emptyForm)

  const isViewMode = modalMode === 'view'
  const isFormModal = modalMode === 'add' || modalMode === 'edit'

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc',
    }))
    setCurrentPage(1)
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)

    try {
      const params = new URLSearchParams()
      params.set('sort_by', sortConfig.key)
      params.set('order', sortConfig.order)

      if (selectedPeriod) {
        const [year] = selectedPeriod.split('-')
        if (year) params.set('year', year)
      }

      const response = await fetchWithAuth(`/api/keuangan?${params.toString()}`, { cache: 'no-store' })
      if (!response.ok) {
        throw new Error(await getUserFriendlyApiError(response, 'Maaf, data buku kas belum bisa dimuat.'))
      }

      const data = (await response.json()) as KeuanganItem[]
      setItems(data)
    } catch (error) {
      showToast(
        'error',
        toUserFriendlyMessage(
          error instanceof Error ? error.message : null,
          'Maaf, data buku kas belum bisa dimuat.',
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }, [showToast, selectedPeriod, sortConfig])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const categoryOptions = useMemo(() => {
    const categories = new Set<string>()
    for (const item of items) {
      categories.add(item.kategori)
    }
    return ['all', ...Array.from(categories).sort((a, b) => a.localeCompare(b, 'id'))]
  }, [items])

  const ledgerRows = useMemo(() => {
    let runningBalance = 0

    return sortByDateAndId(items).map<LedgerRow>((item) => {
      const cashIn = item.jenis === 'pemasukan' ? item.jumlah : 0
      const cashOut = item.jenis === 'pengeluaran' ? item.jumlah : 0
      runningBalance += cashIn - cashOut

      return {
        ...item,
        refNo: `KAS-${String(item.id).padStart(6, '0')}`,
        cashIn,
        cashOut,
        balance: runningBalance,
      }
    })
  }, [items])

  const filteredRows = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()

    return ledgerRows.filter((item) => {
      const byCategory = categoryFilter === 'all' || item.kategori === categoryFilter
      const bySearch =
        normalized.length === 0 ||
        item.keterangan?.toLowerCase().includes(normalized) ||
        item.refNo.toLowerCase().includes(normalized) ||
        item.kategori.toLowerCase().includes(normalized)
      // Exact YYYY-MM prefix match against the full date string (e.g. "2026-02-15".startsWith("2026-02"))
      const bySelectedPeriod = !selectedPeriod || item.tanggal.startsWith(selectedPeriod)

      return byCategory && Boolean(bySearch) && bySelectedPeriod
    })
  }, [ledgerRows, searchTerm, categoryFilter, selectedPeriod])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE))

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE
    return filteredRows.slice(start, start + ROWS_PER_PAGE)
  }, [filteredRows, currentPage])

  const totals = useMemo(() => {
    const selectedYear = selectedPeriod ? selectedPeriod.split('-')[0] : String(new Date().getFullYear())

    // Yearly totals: computed from ALL ledger rows in the year (unaffected by search/category filters)
    const yearlyPemasukan = ledgerRows
      .filter((row) => row.tanggal.startsWith(selectedYear))
      .reduce((sum, row) => sum + row.cashIn, 0)

    const yearlyPengeluaran = ledgerRows
      .filter((row) => row.tanggal.startsWith(selectedYear))
      .reduce((sum, row) => sum + row.cashOut, 0)

    // Monthly totals: computed from filteredRows (items in the selected YYYY-MM month, with search/category filters)
    const periodTotals = filteredRows.reduce(
      (acc, row) => {
        acc.cashIn += row.cashIn
        acc.cashOut += row.cashOut
        return acc
      },
      { cashIn: 0, cashOut: 0 },
    )

    // Saldo Akhir Bulan Ini: the running balance at the end of the selected month.
    // Use ledgerRows filtered only by the selected period (ignoring text/category filters) so
    // the balance is always the true end-of-month cumulative balance regardless of active search.
    const rowsInPeriod = selectedPeriod
      ? ledgerRows.filter((row) => row.tanggal.startsWith(selectedPeriod))
      : ledgerRows
    const lastRowInPeriod = rowsInPeriod[rowsInPeriod.length - 1]
    const balance = lastRowInPeriod ? lastRowInPeriod.balance : 0

    return {
      ...periodTotals,
      balance,
      yearlyPemasukan,
      yearlyPengeluaran,
      yearlyBalance: yearlyPemasukan - yearlyPengeluaran,
      selectedYear,
    }
  }, [filteredRows, ledgerRows, selectedPeriod])

  const closeModal = () => {
    setModalMode(null)
    setSelectedItem(null)
    setForm(emptyForm)
    setFormErrorMessage('')
  }

  const openAddModal = () => {
    setFormErrorMessage('')
    setForm(emptyForm)
    setSelectedItem(null)
    setModalMode('add')
  }

  const openViewModal = (item: KeuanganItem) => {
    setFormErrorMessage('')
    setSelectedItem(item)
    setForm(toForm(item))
    setModalMode('view')
  }

  const openEditModal = (item: KeuanganItem) => {
    setFormErrorMessage('')
    setSelectedItem(item)
    setForm(toForm(item))
    setModalMode('edit')
  }

  const updateForm = <K extends keyof KeuanganForm>(key: K, value: KeuanganForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormErrorMessage('')
    setIsSaving(true)

    try {
      const isEdit = modalMode === 'edit' && selectedItem
      const payload = isEdit
        ? { id: selectedItem.id, ...form, jumlah: Number(form.jumlah) }
        : { ...form, jumlah: Number(form.jumlah) }

      const response = await fetchWithAuth('/api/keuangan', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(await getUserFriendlyApiError(response, 'Maaf, terjadi kendala saat menyimpan data keuangan.'))
      }

      const saved = (await response.json()) as KeuanganItem
      if (isEdit) {
        setItems((prev) => prev.map((item) => (item.id === saved.id ? saved : item)))
        showToast('success', `Data keuangan ${saved.kategori} berhasil diperbarui.`)
      } else {
        setItems((prev) => [saved, ...prev])
        setCurrentPage(1)
        showToast('success', `Data keuangan ${saved.kategori} berhasil ditambahkan.`)
      }
      closeModal()
    } catch (error) {
      setFormErrorMessage(
        toUserFriendlyMessage(
          error instanceof Error ? error.message : null,
          'Maaf, terjadi kendala saat menyimpan data keuangan.',
        ),
      )
    } finally {
      setIsSaving(false)
    }
  }

  /** Opens the confirmation modal — actual deletion happens in handleConfirmDelete */
  const handleDelete = (item: KeuanganItem) => {
    setConfirmTarget(item)
  }

  /** Called when the user clicks "Ya, Hapus" inside ConfirmModal */
  const handleConfirmDelete = async () => {
    if (!confirmTarget) return

    const target = confirmTarget
    setDeletingId(target.id)

    try {
      const response = await fetchWithAuth(`/api/keuangan?id=${target.id}`, { method: 'DELETE' })
      if (!response.ok) {
        throw new Error(await getUserFriendlyApiError(response, 'Maaf, data keuangan belum bisa dihapus sekarang.'))
      }

      setItems((prev) => prev.filter((row) => row.id !== target.id))
      setConfirmTarget(null)
      showToast('success', `Data keuangan ${target.kategori} (${formatDate(target.tanggal)}) berhasil dihapus.`)
    } catch (error) {
      setConfirmTarget(null)
      showToast(
        'error',
        toUserFriendlyMessage(
          error instanceof Error ? error.message : null,
          'Maaf, data keuangan belum bisa dihapus sekarang.',
        ),
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Toast portal ──────────────────────────────────────────────────── */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* ── Confirm-delete modal ──────────────────────────────────────────── */}
      <ConfirmModal
        open={confirmTarget !== null}
        title="Hapus Data Keuangan"
        description={
          confirmTarget
            ? `Apakah kamu mau menghapus data keuangan ${confirmTarget.kategori} (${formatDate(confirmTarget.tanggal)})?`
            : 'Apakah kamu mau menghapus data ini?'
        }
        isLoading={deletingId !== null}
        onConfirm={() => { void handleConfirmDelete() }}
        onCancel={() => setConfirmTarget(null)}
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Data Keuangan</h1>
          <p className="mt-1 text-sm text-slate-500">Buku kas untuk memantau pemasukan, pengeluaran, dan saldo berjalan RT.</p>
        </div>
        <button type="button" className="btn-primary gap-2" onClick={openAddModal}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tambah Data
        </button>
      </div>

      <div className="order-last grid gap-3 sm:grid-cols-2 lg:order-none lg:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pemasukan (Bulan Ini)</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">{formatCurrency(totals.cashIn)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pengeluaran (Bulan Ini)</p>
          <p className="mt-2 text-2xl font-semibold text-red-600">{formatCurrency(totals.cashOut)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saldo Akhir (Bulan Ini)</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(totals.balance)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Pemasukan Tahun {totals.selectedYear}
          </p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">{formatCurrency(totals.yearlyPemasukan)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Pengeluaran Tahun {totals.selectedYear}
          </p>
          <p className="mt-2 text-2xl font-semibold text-red-600">{formatCurrency(totals.yearlyPengeluaran)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Saldo Bersih Tahun {totals.selectedYear}
          </p>
          <p className={`mt-2 text-2xl font-semibold ${totals.yearlyBalance >= 0 ? 'text-primary' : 'text-red-600'}`}>
            {formatCurrency(totals.yearlyBalance)}
          </p>
        </div>
      </div>

      {/* ── Filter Periode ────────────────────────────────────────────────── */}
      <div className="card p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Filter Periode</p>
        <label className="space-y-1 text-sm text-slate-600">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pilih Periode</span>
          <input
            type="month"
            className="input-field"
            value={selectedPeriod}
            onChange={(event) => {
              setSelectedPeriod(event.target.value)
              setCurrentPage(1)
            }}
          />
        </label>
      </div>

      <div className="card p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cari Ref/Deskripsi</span>
            <input
              className="input-field"
              placeholder="Cari nomor referensi atau keterangan"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value)
                setCurrentPage(1)
              }}
            />
          </label>
          <label className="space-y-1 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filter Kategori</span>
            <select
              className="input-field"
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value)
                setCurrentPage(1)
              }}
            >
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'Semua Kategori' : option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm text-slate-700">
            <thead className="border-b border-border bg-background">
              <tr>
                <th
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-primary"
                  onClick={() => handleSort('tanggal')}
                  aria-sort={sortConfig.key === 'tanggal' ? (sortConfig.order === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Tanggal
                  <SortIcon columnKey="tanggal" sortConfig={sortConfig} />
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ref No</th>
                <th
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-primary"
                  onClick={() => handleSort('keterangan')}
                  aria-sort={sortConfig.key === 'keterangan' ? (sortConfig.order === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Keterangan
                  <SortIcon columnKey="keterangan" sortConfig={sortConfig} />
                </th>
                <th
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-primary"
                  onClick={() => handleSort('kategori')}
                  aria-sort={sortConfig.key === 'kategori' ? (sortConfig.order === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Kategori
                  <SortIcon columnKey="kategori" sortConfig={sortConfig} />
                </th>
                <th
                  className="cursor-pointer select-none px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-primary"
                  onClick={() => handleSort('jumlah')}
                  aria-sort={sortConfig.key === 'jumlah' ? (sortConfig.order === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Pemasukan
                  <SortIcon columnKey="jumlah" sortConfig={sortConfig} />
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Pengeluaran</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Saldo</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-6 py-10 text-center text-sm text-slate-500" colSpan={8}>
                    Memuat data buku kas...
                  </td>
                </tr>
              ) : null}

              {!isLoading && filteredRows.length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-center text-sm text-slate-500" colSpan={8}>
                    Tidak ada data transaksi yang cocok dengan filter.
                  </td>
                </tr>
              ) : null}

              {!isLoading
                ? paginatedRows.map((item) => (
                    <tr key={item.id} className="border-t border-border transition-colors hover:bg-primary/[0.04]">
                      <td className="px-6 py-4 text-slate-600">{formatDate(item.tanggal)}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-600">{item.refNo}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{item.keterangan || '-'}</td>
                      <td className="px-6 py-4 text-slate-600">{item.kategori}</td>
                      <td className="px-6 py-4 text-right font-medium text-emerald-600">
                        {item.cashIn > 0 ? formatCurrency(item.cashIn) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-red-600">
                        {item.cashOut > 0 ? formatCurrency(item.cashOut) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-900">{formatCurrency(item.balance)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-corporate border border-border text-slate-500 transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                            onClick={() => openViewModal(item)}
                            aria-label={`Lihat ${item.kategori}`}
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-corporate border border-border text-slate-500 transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                            onClick={() => openEditModal(item)}
                            aria-label={`Ubah ${item.kategori}`}
                          >
                            <Edit className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-corporate border border-border text-slate-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item.id}
                            aria-label={`Hapus ${item.kategori}`}
                          >
                            <Trash className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
        <TablePagination
          totalItems={filteredRows.length}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          rowsPerPage={ROWS_PER_PAGE}
          itemLabel="transaksi"
        />
      </div>

      {modalMode ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 p-4">
          <div className="card modal-content w-full max-w-2xl border border-border/80 bg-surface">
            <div className="flex items-start justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {modalMode === 'add' ? 'Tambah Data Keuangan' : null}
                  {modalMode === 'view' ? 'Detail Keuangan' : null}
                  {modalMode === 'edit' ? 'Ubah Data Keuangan' : null}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {modalMode === 'view' ? 'Data ditampilkan dalam mode baca saja.' : 'Lengkapi data transaksi dengan benar.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-9 w-9 items-center justify-center rounded-corporate border border-border text-slate-500 transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                aria-label="Tutup modal"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {isViewMode && selectedItem ? (
              <div className="grid gap-4 px-6 py-6 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {formatDate(selectedItem.tanggal)}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jenis</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700 capitalize">
                    {selectedItem.jenis}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kategori</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {selectedItem.kategori}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jumlah</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm font-semibold text-slate-700">
                    {formatCurrency(selectedItem.jumlah)}
                  </div>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Keterangan</p>
                  <div className="min-h-20 rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {selectedItem.keterangan || '-'}
                  </div>
                </div>
              </div>
            ) : null}

            {isFormModal ? (
              <form className="px-6 py-6" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal</span>
                    <input
                      type="date"
                      className="input-field"
                      value={form.tanggal}
                      required
                      onChange={(event) => updateForm('tanggal', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jenis</span>
                    <select
                      className="input-field"
                      value={form.jenis}
                      onChange={(event) => updateForm('jenis', event.target.value as KeuanganJenis)}
                    >
                      <option value="pemasukan">Pemasukan</option>
                      <option value="pengeluaran">Pengeluaran</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kategori</span>
                    <input
                      className="input-field"
                      value={form.kategori}
                      maxLength={64}
                      required
                      placeholder="mis. Iuran Bulanan, Kebersihan"
                      onChange={(event) => updateForm('kategori', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jumlah (Rp)</span>
                    <input
                      type="number"
                      className="input-field"
                      value={form.jumlah}
                      min={0}
                      required
                      placeholder="0"
                      onChange={(event) => updateForm('jumlah', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-600 sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Keterangan</span>
                    <textarea
                      className="input-field min-h-24"
                      value={form.keterangan}
                      maxLength={2000}
                      placeholder="Keterangan tambahan (opsional)"
                      onChange={(event) => updateForm('keterangan', event.target.value)}
                    />
                  </label>
                </div>

                {formErrorMessage ? (
                  <div className="mt-4 rounded-corporate border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formErrorMessage}
                  </div>
                ) : null}

                <div className="mt-6 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex items-center justify-center rounded-corporate border border-border px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                  >
                    Batal
                  </button>
                  <button type="submit" className="btn-primary px-4 py-2" disabled={isSaving}>
                    {isSaving ? 'Menyimpan...' : 'Simpan Data'}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
