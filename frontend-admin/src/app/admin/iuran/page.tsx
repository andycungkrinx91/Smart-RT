'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, Eye, Plus, SquarePen as Edit, Trash2 as Trash, X } from 'lucide-react'
import { DEFAULT_ROWS_PER_PAGE, TablePagination } from '@/components/table/TablePagination'
import { fetchWithAuth } from '@/lib/client-api'
import { getUserFriendlyApiError, toUserFriendlyMessage } from '@/lib/user-friendly-error'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import { formatCurrency, formatPeriod } from '@/lib/format'
import { useStatsStream } from '@/hooks/useStatsStream'

type IuranStatus = 'lunas' | 'belum_lunas'

type IuranItem = {
  id: number
  no_kk: string
  nama_kepala_keluarga: string
  bulan: string
  jumlah: number
  status_pembayaran: IuranStatus
  tanggal_bayar: string | null
  metode_pembayaran: string | null
  alamat: string | null
  keterangan: string | null
  created_at: string
}

type KartuKeluargaItem = {
  no_kk: string
  nama_kepala_keluarga: string
  alamat: string
}

type IuranTableRow = IuranItem & {
  houseNo: string
}

type IuranForm = {
  no_kk: string
  bulan: string
  jumlah: string
  status_pembayaran: IuranStatus
  tanggal_bayar: string
  metode_pembayaran: string
  alamat: string
  keterangan: string
}

type SortOrder = 'asc' | 'desc'

type SortConfig = {
  key: string
  order: SortOrder
}

const emptyForm: IuranForm = {
  no_kk: '',
  bulan: '',
  jumlah: '',
  status_pembayaran: 'belum_lunas',
  tanggal_bayar: '',
  metode_pembayaran: '',
  alamat: '',
  keterangan: '',
}

const ROWS_PER_PAGE = DEFAULT_ROWS_PER_PAGE

function statusBadgeClass(status: IuranStatus) {
  if (status === 'lunas') {
    return 'status-badge status-badge-active'
  }

  return 'status-badge status-badge-inactive'
}

function statusLabel(status: IuranStatus) {
  return status === 'lunas' ? 'Lunas' : 'Belum Lunas'
}

function toForm(item: IuranItem): IuranForm {
  return {
    no_kk: item.no_kk,
    bulan: item.bulan,
    jumlah: String(item.jumlah),
    status_pembayaran: item.status_pembayaran,
    tanggal_bayar: item.tanggal_bayar ?? '',
    metode_pembayaran: item.metode_pembayaran ?? '',
    alamat: item.alamat ?? '',
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

export default function IuranPage() {
  const { stats } = useStatsStream()
  const [items, setItems] = useState<IuranItem[]>([])
  const [kkItems, setKkItems] = useState<KartuKeluargaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [payingId, setPayingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [formErrorMessage, setFormErrorMessage] = useState('')

  // ── Toast system ──────────────────────────────────────────────────────────
  const { toasts, showToast, dismissToast } = useToast()

  // ── Confirm-delete modal state ────────────────────────────────────────────
  const [confirmTarget, setConfirmTarget] = useState<IuranItem | null>(null)

  const [residentFilter, setResidentFilter] = useState('')
  const [periodFilter, setPeriodFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | IuranStatus>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // ── Period filter state (single month input) ──────────────────────────────
  const [selectedPeriod, setSelectedPeriod] = useState<string>(getCurrentMonthValue())

  // ── Sort state ────────────────────────────────────────────────────────────
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id', order: 'desc' })

  const [selectedItem, setSelectedItem] = useState<IuranItem | null>(null)
  const [modalMode, setModalMode] = useState<'add' | 'view' | 'edit' | null>(null)
  const [form, setForm] = useState<IuranForm>(emptyForm)

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
        const [year, month] = selectedPeriod.split('-')
        if (year) params.set('year', year)
        if (month) params.set('month', month)
      }

      const [iuranResponse, kkResponse] = await Promise.all([
        fetchWithAuth(`/api/iuran?${params.toString()}`, { cache: 'no-store' }),
        fetchWithAuth('/api/kk', { cache: 'no-store' }),
      ])

      if (!iuranResponse.ok) {
        throw new Error(await getUserFriendlyApiError(iuranResponse, 'Maaf, data iuran warga belum bisa dimuat.'))
      }

      if (!kkResponse.ok) {
        throw new Error(await getUserFriendlyApiError(kkResponse, 'Maaf, data rumah warga belum bisa dimuat.'))
      }

      const iuranData = (await iuranResponse.json()) as IuranItem[]
      const kkData = (await kkResponse.json()) as KartuKeluargaItem[]
      setItems(iuranData)
      setKkItems(kkData)
    } catch (error) {
      showToast(
        'error',
        toUserFriendlyMessage(
          error instanceof Error ? error.message : null,
          'Maaf, data iuran warga belum bisa dimuat.',
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }, [showToast, selectedPeriod, sortConfig])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const tableRows = useMemo(() => {
    return items.map<IuranTableRow>((item) => ({
      ...item,
      houseNo: item.no_kk,
    }))
  }, [items])

  const filteredRows = useMemo(() => {
    const normalizedResident = residentFilter.trim().toLowerCase()
    const normalizedPeriod = periodFilter.trim().toLowerCase()

    return tableRows.filter((item) => {
      const byResident =
        normalizedResident.length === 0 ||
        item.nama_kepala_keluarga.toLowerCase().includes(normalizedResident) ||
        item.houseNo.toLowerCase().includes(normalizedResident)

      const byPeriod = normalizedPeriod.length === 0 || item.bulan.toLowerCase().includes(normalizedPeriod)
      const byStatus = statusFilter === 'all' || item.status_pembayaran === statusFilter
      // Exact YYYY-MM match against the bulan field
      const bySelectedPeriod = !selectedPeriod || item.bulan === selectedPeriod

      return byResident && byPeriod && byStatus && bySelectedPeriod
    })
  }, [tableRows, residentFilter, periodFilter, statusFilter, selectedPeriod])

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

    // Yearly totals: computed from ALL items in the year (tableRows, unaffected by month/status filters)
    const yearlyItems = tableRows.filter((item) => item.bulan.startsWith(selectedYear))
    const yearlyTotal = yearlyItems.reduce((sum, item) => sum + item.jumlah, 0)
    const yearlyTunggakan = yearlyItems.filter(i => i.status_pembayaran !== 'lunas').reduce((sum, item) => sum + item.jumlah, 0)
    const yearlyPaidCount = yearlyItems.filter(i => i.status_pembayaran === 'lunas').length
    const yearlyUnpaidCount = yearlyItems.filter(i => i.status_pembayaran !== 'lunas').length

    // Monthly totals: computed from filteredRows (items in the selected YYYY-MM month)
    const periodTotals = filteredRows.reduce(
      (acc, item) => {
        acc.totalAmount += item.jumlah
        if (item.status_pembayaran === 'lunas') {
          acc.paid += 1
        } else {
          acc.unpaid += 1
          acc.unpaidAmount += item.jumlah
        }
        return acc
      },
      { paid: 0, unpaid: 0, unpaidAmount: 0, totalAmount: 0 },
    )

    return { 
      month: periodTotals, 
      year: { 
        total: yearlyTotal, 
        tunggakan: yearlyTunggakan, 
        paid: yearlyPaidCount, 
        unpaid: yearlyUnpaidCount 
      }, 
      selectedYear 
    }
  }, [filteredRows, tableRows, selectedPeriod])

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

  const openViewModal = (item: IuranItem) => {
    setFormErrorMessage('')
    setSelectedItem(item)
    setForm(toForm(item))
    setModalMode('view')
  }

  const openEditModal = (item: IuranItem) => {
    setFormErrorMessage('')
    setSelectedItem(item)
    setForm(toForm(item))
    setModalMode('edit')
  }

  const updateForm = <K extends keyof IuranForm>(key: K, value: IuranForm[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }

      // Auto-fill alamat when no_kk changes
      if (key === 'no_kk') {
        const selectedKK = kkItems.find((kk) => kk.no_kk === value)
        if (selectedKK) {
          next.alamat = selectedKK.alamat
        }
      }

      return next
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormErrorMessage('')
    setIsSaving(true)

    try {
      const isEdit = modalMode === 'edit' && selectedItem
      const formPayload = {
        no_kk: form.no_kk,
        bulan: form.bulan,
        jumlah: Number(form.jumlah),
        status_pembayaran: form.status_pembayaran,
        tanggal_bayar: form.tanggal_bayar || null,
        metode_pembayaran: form.metode_pembayaran || null,
        alamat: form.alamat || null,
        keterangan: form.keterangan || null,
      }
      const payload = isEdit ? { id: selectedItem.id, ...formPayload } : formPayload

      const response = await fetchWithAuth('/api/iuran', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(await getUserFriendlyApiError(response, 'Maaf, terjadi kendala saat menyimpan data iuran.'))
      }

      const saved = (await response.json()) as IuranItem
      if (isEdit) {
        setItems((prev) => prev.map((item) => (item.id === saved.id ? saved : item)))
        showToast('success', `Data iuran ${saved.nama_kepala_keluarga} berhasil diperbarui.`)
      } else {
        setItems((prev) => [saved, ...prev])
        setCurrentPage(1)
        showToast('success', `Data iuran ${saved.nama_kepala_keluarga} berhasil ditambahkan.`)
      }
      closeModal()
    } catch (error) {
      setFormErrorMessage(
        toUserFriendlyMessage(
          error instanceof Error ? error.message : null,
          'Maaf, terjadi kendala saat menyimpan data iuran.',
        ),
      )
    } finally {
      setIsSaving(false)
    }
  }

  /** Opens the confirmation modal — actual deletion happens in handleConfirmDelete */
  const handleDelete = (item: IuranItem) => {
    setConfirmTarget(item)
  }

  /** Called when the user clicks "Ya, Hapus" inside ConfirmModal */
  const handleConfirmDelete = async () => {
    if (!confirmTarget) return

    const target = confirmTarget
    setDeletingId(target.id)

    try {
      const response = await fetchWithAuth(`/api/iuran?id=${target.id}`, { method: 'DELETE' })
      if (!response.ok) {
        throw new Error(await getUserFriendlyApiError(response, 'Maaf, data iuran belum bisa dihapus sekarang.'))
      }

      setItems((prev) => prev.filter((row) => row.id !== target.id))
      setConfirmTarget(null)
      showToast('success', `Data iuran ${target.nama_kepala_keluarga} (${formatPeriod(target.bulan)}) berhasil dihapus.`)
    } catch (error) {
      setConfirmTarget(null)
      showToast(
        'error',
        toUserFriendlyMessage(
          error instanceof Error ? error.message : null,
          'Maaf, data iuran belum bisa dihapus sekarang.',
        ),
      )
    } finally {
      setDeletingId(null)
    }
  }

  const handleRecordPayment = useCallback(async (item: IuranTableRow) => {
    if (item.status_pembayaran === 'lunas') {
      return
    }

    setPayingId(item.id)

    const paymentDate = new Date().toISOString().slice(0, 10)

    try {
      const updateResponse = await fetchWithAuth('/api/iuran', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          status_pembayaran: 'lunas',
          tanggal_bayar: paymentDate,
          metode_pembayaran: 'cash',
          keterangan: `Pembayaran iuran periode ${item.bulan}`,
        }),
      })

      if (!updateResponse.ok) {
        throw new Error(await getUserFriendlyApiError(updateResponse, 'Maaf, status iuran belum bisa diperbarui.'))
      }

      const updatedIuran = (await updateResponse.json()) as IuranItem

      const ledgerResponse = await fetchWithAuth('/api/keuangan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tanggal: paymentDate,
          jenis: 'pemasukan',
          kategori: 'Iuran Warga',
          keterangan: `Pembayaran iuran ${item.nama_kepala_keluarga} periode ${item.bulan}`,
          jumlah: item.jumlah,
        }),
      })

      if (!ledgerResponse.ok) {
        const rollbackResponse = await fetchWithAuth('/api/iuran', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: item.id,
            status_pembayaran: item.status_pembayaran,
            tanggal_bayar: item.tanggal_bayar,
            metode_pembayaran: item.metode_pembayaran,
            keterangan: item.keterangan,
          }),
        })

        if (rollbackResponse.ok) {
          throw new Error(
            await getUserFriendlyApiError(
              ledgerResponse,
              'Maaf, buku kas belum bisa diperbarui sehingga pembayaran dibatalkan.',
            ),
          )
        }

        throw new Error(
          await getUserFriendlyApiError(
            ledgerResponse,
            'Iuran sudah terupdate, tetapi buku kas gagal tercatat. Mohon cek data keuangan.',
          ),
        )
      }

      setItems((prev) => prev.map((row) => (row.id === updatedIuran.id ? updatedIuran : row)))
      showToast('success', `Pembayaran untuk ${item.nama_kepala_keluarga} (${formatPeriod(item.bulan)}) berhasil dicatat.`)
    } catch (error) {
      showToast(
        'error',
        toUserFriendlyMessage(
          error instanceof Error ? error.message : null,
          'Maaf, pembayaran iuran belum bisa dicatat sekarang.',
        ),
      )
    } finally {
      setPayingId(null)
    }
  }, [showToast])

  return (
    <div className="flex flex-col gap-5">
      {/* ── Toast portal ──────────────────────────────────────────────────── */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* ── Confirm-delete modal ──────────────────────────────────────────── */}
      <ConfirmModal
        open={confirmTarget !== null}
        title="Hapus Data Iuran"
        description={
          confirmTarget
            ? `Apakah kamu mau menghapus data iuran ${confirmTarget.nama_kepala_keluarga} periode ${formatPeriod(confirmTarget.bulan)}?`
            : 'Apakah kamu mau menghapus data ini?'
        }
        isLoading={deletingId !== null}
        onConfirm={() => { void handleConfirmDelete() }}
        onCancel={() => setConfirmTarget(null)}
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Data Iuran Warga</h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola iuran bulanan, status pembayaran, dan pencatatan kas masuk secara langsung.
          </p>
        </div>
        <button type="button" className="btn-primary gap-2" onClick={openAddModal}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tambah Data
        </button>
      </div>

      <div className="order-last space-y-6 rounded-2xl border border-slate-200 bg-slate-50/50 p-6 lg:order-none">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Ringkasan Data Iuran</h2>
          <p className="text-sm text-slate-500">Pantauan pembayaran iuran bulanan dan tunggakan warga berdasarkan filter.</p>
        </div>

        {/* Laporan Bulan Ini */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-slate-800">
            Laporan Bulan Ini {selectedPeriod ? `(${formatPeriod(selectedPeriod)})` : ''}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Iuran</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-blue-600">{formatCurrency(totals.month.totalAmount)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Tunggakan</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-red-600">{formatCurrency(totals.month.unpaidAmount)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lunas (KK)</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">{stats.iuran_lunas_bulan_ini}</p>
              <p className="mt-1 text-xs text-slate-400">Kepala Keluarga yang sudah bayar</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Belum Lunas (KK)</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-red-600">{stats.iuran_belum_lunas_bulan_ini}</p>
              <p className="mt-1 text-xs text-slate-400">Kepala Keluarga yang belum bayar</p>
            </div>
          </div>
        </div>

        {/* Laporan Tahun Ini */}
        <div className="space-y-4 pt-4 border-t border-slate-200/60">
          <h3 className="text-base font-semibold text-slate-800">
            Laporan Tahun Ini ({totals.selectedYear})
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Iuran</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-blue-600">{formatCurrency(totals.year.total)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Tunggakan</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-red-600">{formatCurrency(totals.year.tunggakan)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lunas (KK)</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">{stats.iuran_lunas_tahun_ini}</p>
              <p className="mt-1 text-xs text-slate-400">Kepala Keluarga yang sudah bayar</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Belum Lunas (KK)</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-red-600">{stats.iuran_belum_lunas_tahun_ini}</p>
              <p className="mt-1 text-xs text-slate-400">Kepala Keluarga yang belum bayar</p>
            </div>
          </div>
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
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cari Warga / No. Rumah</span>
            <input
              className="input-field"
              placeholder="Cari nama warga atau nomor rumah"
              value={residentFilter}
              onChange={(event) => {
                setResidentFilter(event.target.value)
                setCurrentPage(1)
              }}
            />
          </label>
          <label className="space-y-1 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filter Periode</span>
            <input
              className="input-field"
              placeholder="Contoh: 2026-02"
              value={periodFilter}
              onChange={(event) => {
                setPeriodFilter(event.target.value)
                setCurrentPage(1)
              }}
            />
          </label>
          <label className="space-y-1 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filter Status</span>
            <select
              className="input-field"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as 'all' | IuranStatus)
                setCurrentPage(1)
              }}
            >
              <option value="all">Semua Status</option>
              <option value="lunas">Lunas</option>
              <option value="belum_lunas">Belum Lunas</option>
            </select>
          </label>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm text-slate-700">
            <thead className="border-b border-border bg-background">
              <tr>
                <th
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-primary"
                  onClick={() => handleSort('no_kk')}
                  aria-sort={sortConfig.key === 'no_kk' ? (sortConfig.order === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  No. Rumah
                  <SortIcon columnKey="no_kk" sortConfig={sortConfig} />
                </th>
                <th
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-primary"
                  onClick={() => handleSort('nama_kepala_keluarga')}
                  aria-sort={sortConfig.key === 'nama_kepala_keluarga' ? (sortConfig.order === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Nama Warga
                  <SortIcon columnKey="nama_kepala_keluarga" sortConfig={sortConfig} />
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Alamat
                </th>
                <th
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-primary"
                  onClick={() => handleSort('bulan')}
                  aria-sort={sortConfig.key === 'bulan' ? (sortConfig.order === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Periode
                  <SortIcon columnKey="bulan" sortConfig={sortConfig} />
                </th>
                <th
                  className="cursor-pointer select-none px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-primary"
                  onClick={() => handleSort('jumlah')}
                  aria-sort={sortConfig.key === 'jumlah' ? (sortConfig.order === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Jumlah
                  <SortIcon columnKey="jumlah" sortConfig={sortConfig} />
                </th>
                <th
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-primary"
                  onClick={() => handleSort('status_pembayaran')}
                  aria-sort={sortConfig.key === 'status_pembayaran' ? (sortConfig.order === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Status
                  <SortIcon columnKey="status_pembayaran" sortConfig={sortConfig} />
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</th>
              </tr>
            </thead>
                <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-6 py-10 text-center text-sm text-slate-500" colSpan={7}>
                    Memuat data iuran warga...
                  </td>
                </tr>
              ) : null}

              {!isLoading && filteredRows.length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-center text-sm text-slate-500" colSpan={7}>
                    Tidak ada data iuran yang cocok dengan filter.
                  </td>
                </tr>
              ) : null}

              {!isLoading
                ? paginatedRows.map((item) => (
                    <tr key={item.id} className="border-t border-border transition-colors hover:bg-primary/[0.04]">
                      <td className="px-6 py-4 font-mono text-xs text-slate-600">{item.houseNo}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{item.nama_kepala_keluarga}</td>
                      <td className="px-6 py-4 text-slate-600">{item.alamat || '-'}</td>
                      <td className="px-6 py-4 text-slate-600">{formatPeriod(item.bulan)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-900">{formatCurrency(item.jumlah)}</td>
                      <td className="px-6 py-4">
                        <span className={statusBadgeClass(item.status_pembayaran)}>{statusLabel(item.status_pembayaran)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-corporate border border-border text-slate-500 transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                            onClick={() => openViewModal(item)}
                            aria-label={`Lihat ${item.nama_kepala_keluarga}`}
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-corporate border border-border text-slate-500 transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                            onClick={() => openEditModal(item)}
                            aria-label={`Ubah ${item.nama_kepala_keluarga}`}
                          >
                            <Edit className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-corporate border border-border text-slate-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item.id}
                            aria-label={`Hapus ${item.nama_kepala_keluarga}`}
                          >
                            <Trash className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center gap-1.5 rounded-corporate border border-border px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => {
                              void handleRecordPayment(item)
                            }}
                            disabled={item.status_pembayaran === 'lunas' || payingId === item.id}
                            aria-label={`Catat pembayaran ${item.nama_kepala_keluarga}`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            {payingId === item.id ? 'Memproses...' : 'Bayar'}
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
          itemLabel="iuran"
        />
      </div>

      {modalMode ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 p-4">
          <div className="card modal-content w-full max-w-3xl border border-border/80 bg-surface">
            <div className="flex items-start justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {modalMode === 'add' ? 'Tambah Data Iuran' : null}
                  {modalMode === 'view' ? 'Detail Iuran Warga' : null}
                  {modalMode === 'edit' ? 'Ubah Data Iuran' : null}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {modalMode === 'view' ? 'Data ditampilkan dalam mode baca saja.' : 'Lengkapi data iuran dengan benar.'}
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">No. KK</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 font-mono text-sm text-slate-700">
                    {selectedItem.no_kk}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nama Kepala Keluarga</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {selectedItem.nama_kepala_keluarga}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Periode</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {formatPeriod(selectedItem.bulan)}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jumlah</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {formatCurrency(selectedItem.jumlah)}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status Pembayaran</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    <span className={statusBadgeClass(selectedItem.status_pembayaran)}>
                      {statusLabel(selectedItem.status_pembayaran)}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal Bayar</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {selectedItem.tanggal_bayar ?? '-'}
                  </div>
                </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Metode Pembayaran</p>
                    <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                      {selectedItem.metode_pembayaran ?? '-'}
                    </div>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alamat</p>
                    <div className="min-h-16 rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                      {selectedItem.alamat ?? '-'}
                    </div>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Keterangan</p>

                  <div className="min-h-16 rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {selectedItem.keterangan ?? '-'}
                  </div>
                </div>
              </div>
            ) : null}

            {isFormModal ? (
              <form className="px-6 py-6" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pilih Warga (No. KK)</span>
                    <select
                      className="input-field"
                      value={form.no_kk}
                      required
                      onChange={(event) => updateForm('no_kk', event.target.value)}
                    >
                      <option value="">-- Pilih Warga --</option>
                      {kkItems.map((kk) => (
                        <option key={kk.no_kk} value={kk.no_kk}>
                          {kk.nama_kepala_keluarga} ({kk.no_kk})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alamat</span>
                    <div className="input-field bg-slate-50">
                      {form.alamat || 'Pilih warga terlebih dahulu'}
                    </div>
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bulan (Periode)</span>
                    <input
                      className="input-field"
                      type="month"
                      value={form.bulan}
                      required
                      onChange={(event) => updateForm('bulan', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jumlah (Rp)</span>
                    <input
                      className="input-field"
                      type="number"
                      min="0"
                      placeholder="Contoh: 50000"
                      value={form.jumlah}
                      required
                      onChange={(event) => updateForm('jumlah', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status Pembayaran</span>
                    <select
                      className="input-field"
                      value={form.status_pembayaran}
                      onChange={(event) => updateForm('status_pembayaran', event.target.value as IuranStatus)}
                    >
                      <option value="belum_lunas">Belum Lunas</option>
                      <option value="lunas">Lunas</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal Bayar (Opsional)</span>
                    <input
                      className="input-field"
                      type="date"
                      value={form.tanggal_bayar}
                      onChange={(event) => updateForm('tanggal_bayar', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Metode Pembayaran (Opsional)</span>
                    <input
                      className="input-field"
                      placeholder="Contoh: cash, transfer"
                      value={form.metode_pembayaran}
                      maxLength={64}
                      onChange={(event) => updateForm('metode_pembayaran', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-600 sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Keterangan (Opsional)</span>
                    <textarea
                      className="input-field min-h-20"
                      placeholder="Tambahkan catatan jika diperlukan"
                      value={form.keterangan}
                      maxLength={500}
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
