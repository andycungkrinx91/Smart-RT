'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Eye, Plus, SquarePen as Edit, Trash2 as Trash, X } from 'lucide-react'
import { TablePagination } from '@/components/table/TablePagination'
import { fetchWithAuth } from '@/lib/client-api'
import { getUserFriendlyApiError, toUserFriendlyMessage } from '@/lib/user-friendly-error'

type PendudukStatus = 'aktif' | 'nonaktif'

type PendudukItem = {
  id: number
  nik: string
  nama_lengkap: string
  alamat: string
  pekerjaan: string
  status: PendudukStatus
  created_at: string
}

type PendudukForm = {
  nik: string
  nama_lengkap: string
  alamat: string
  pekerjaan: string
  status: PendudukStatus
}

type SortOrder = 'asc' | 'desc'

type SortConfig = {
  key: string
  order: SortOrder
}

const emptyForm: PendudukForm = {
  nik: '',
  nama_lengkap: '',
  alamat: '',
  pekerjaan: '',
  status: 'aktif',
}

const ROWS_PER_PAGE = 20

function statusBadgeClass(status: string) {
  const normalized = status.toLowerCase()
  if (normalized === 'aktif' || normalized === 'active') {
    return 'status-badge status-badge-active'
  }

  return 'status-badge status-badge-inactive'
}

function toForm(item: PendudukItem): PendudukForm {
  return {
    nik: item.nik,
    nama_lengkap: item.nama_lengkap,
    alamat: item.alamat,
    pekerjaan: item.pekerjaan,
    status: item.status,
  }
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

export default function PendudukPage() {
  const [items, setItems] = useState<PendudukItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const [nameFilter, setNameFilter] = useState('')
  const [nikFilter, setNikFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // ── Sort state ────────────────────────────────────────────────────────────
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id', order: 'desc' })

  const [selectedItem, setSelectedItem] = useState<PendudukItem | null>(null)
  const [modalMode, setModalMode] = useState<'add' | 'view' | 'edit' | null>(null)
  const [form, setForm] = useState<PendudukForm>(emptyForm)

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
    setErrorMessage('')

    try {
      const params = new URLSearchParams()
      params.set('sort_by', sortConfig.key)
      params.set('order', sortConfig.order)

      const response = await fetchWithAuth(`/api/penduduk?${params.toString()}`, { cache: 'no-store' })
      if (!response.ok) {
        throw new Error(await getUserFriendlyApiError(response, 'Maaf, data penduduk belum bisa dimuat.'))
      }

      const data = (await response.json()) as PendudukItem[]
      // Convert status to lowercase for frontend
      const normalizedData = data.map((item) => ({ ...item, status: item.status.toLowerCase() as PendudukStatus }))
      setItems(normalizedData)
    } catch (error) {
      setErrorMessage(toUserFriendlyMessage(error instanceof Error ? error.message : null, 'Maaf, data penduduk belum bisa dimuat.'))
    } finally {
      setIsLoading(false)
    }
  }, [sortConfig])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const filteredItems = useMemo(() => {
    const normalizedName = nameFilter.trim().toLowerCase()
    const normalizedNik = nikFilter.trim().toLowerCase()

    return items.filter((item) => {
      const byName = normalizedName.length === 0 || item.nama_lengkap.toLowerCase().includes(normalizedName)
      const byNik = normalizedNik.length === 0 || item.nik.toLowerCase().includes(normalizedNik)
      return byName && byNik
    })
  }, [items, nameFilter, nikFilter])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ROWS_PER_PAGE))

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE
    return filteredItems.slice(start, start + ROWS_PER_PAGE)
  }, [filteredItems, currentPage])

  const closeModal = () => {
    setModalMode(null)
    setSelectedItem(null)
    setForm(emptyForm)
  }

  const openAddModal = () => {
    setErrorMessage('')
    setForm(emptyForm)
    setSelectedItem(null)
    setModalMode('add')
  }

  const openViewModal = (item: PendudukItem) => {
    setErrorMessage('')
    setSelectedItem(item)
    setForm(toForm(item))
    setModalMode('view')
  }

  const openEditModal = (item: PendudukItem) => {
    setErrorMessage('')
    setSelectedItem(item)
    setForm(toForm(item))
    setModalMode('edit')
  }

  const updateForm = <K extends keyof PendudukForm>(key: K, value: PendudukForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setIsSaving(true)

    try {
      const isEdit = modalMode === 'edit' && selectedItem
      
      // Convert status to proper case for backend
      const normalizedForm = {
        ...form,
        status: form.status === 'aktif' ? 'Aktif' : 'Nonaktif'
      }
      const payload = isEdit ? { id: selectedItem.id, ...normalizedForm } : normalizedForm

      const response = await fetchWithAuth('/api/penduduk', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(await getUserFriendlyApiError(response, 'Maaf, terjadi kendala saat menyimpan data penduduk.'))
      }

      const saved = (await response.json()) as PendudukItem
      // Convert status to lowercase for frontend
      const normalizedSaved = { ...saved, status: saved.status.toLowerCase() as PendudukStatus }
      if (isEdit) {
        setItems((prev) => prev.map((item) => (item.id === normalizedSaved.id ? normalizedSaved : item)))
      } else {
        setItems((prev) => [normalizedSaved, ...prev])
        setCurrentPage(1)
      }
      closeModal()
    } catch (error) {
      setErrorMessage(toUserFriendlyMessage(error instanceof Error ? error.message : null, 'Maaf, terjadi kendala saat menyimpan data penduduk.'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (item: PendudukItem) => {
    if (!window.confirm(`Hapus data penduduk ${item.nama_lengkap}?`)) {
      return
    }

    setErrorMessage('')
    setDeletingId(item.id)

    try {
      const response = await fetchWithAuth(`/api/penduduk?id=${item.id}`, { method: 'DELETE' })
      if (!response.ok) {
        throw new Error(await getUserFriendlyApiError(response, 'Maaf, data penduduk belum bisa dihapus sekarang.'))
      }

      setItems((prev) => prev.filter((row) => row.id !== item.id))
    } catch (error) {
      setErrorMessage(toUserFriendlyMessage(error instanceof Error ? error.message : null, 'Maaf, data penduduk belum bisa dihapus sekarang.'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Data Penduduk</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola data penduduk dengan proses tambah, lihat, ubah, dan hapus.</p>
        </div>
        <button type="button" className="btn-primary gap-2" onClick={openAddModal}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tambah Data
        </button>
      </div>

      <div className="card p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cari Nama</span>
            <input
              className="input-field"
              placeholder="Cari nama penduduk"
              value={nameFilter}
              onChange={(event) => {
                setNameFilter(event.target.value)
                setCurrentPage(1)
              }}
            />
          </label>
          <label className="space-y-1 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cari NIK</span>
            <input
              className="input-field"
              placeholder="Cari NIK"
              value={nikFilter}
              onChange={(event) => {
                setNikFilter(event.target.value)
                setCurrentPage(1)
              }}
            />
          </label>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-corporate border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
      ) : null}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[800px] w-full text-sm text-slate-700">
            <thead className="border-b border-border bg-background">
              <tr>
                <th
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-primary"
                  onClick={() => handleSort('nik')}
                  aria-sort={sortConfig.key === 'nik' ? (sortConfig.order === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  NIK
                  <SortIcon columnKey="nik" sortConfig={sortConfig} />
                </th>
                <th
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-primary"
                  onClick={() => handleSort('nama_lengkap')}
                  aria-sort={sortConfig.key === 'nama_lengkap' ? (sortConfig.order === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Nama
                  <SortIcon columnKey="nama_lengkap" sortConfig={sortConfig} />
                </th>
                <th
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-primary"
                  onClick={() => handleSort('pekerjaan')}
                  aria-sort={sortConfig.key === 'pekerjaan' ? (sortConfig.order === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Pekerjaan
                  <SortIcon columnKey="pekerjaan" sortConfig={sortConfig} />
                </th>
                <th
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-primary"
                  onClick={() => handleSort('status')}
                  aria-sort={sortConfig.key === 'status' ? (sortConfig.order === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Status
                  <SortIcon columnKey="status" sortConfig={sortConfig} />
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-6 py-10 text-center text-sm text-slate-500" colSpan={5}>
                    Memuat data penduduk...
                  </td>
                </tr>
              ) : null}

              {!isLoading && filteredItems.length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-center text-sm text-slate-500" colSpan={5}>
                    Tidak ada data penduduk yang cocok dengan filter.
                  </td>
                </tr>
              ) : null}

              {!isLoading
                ? paginatedItems.map((item) => (
                    <tr key={item.id} className="border-t border-border transition-colors hover:bg-primary/[0.04]">
                      <td className="px-6 py-4 font-mono text-xs text-slate-600">{item.nik}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{item.nama_lengkap}</td>
                      <td className="px-6 py-4">{item.pekerjaan}</td>
                      <td className="px-6 py-4">
                        <span className={statusBadgeClass(item.status)}>{item.status}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-corporate border border-border text-slate-500 transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                            onClick={() => openViewModal(item)}
                            aria-label={`Lihat ${item.nama_lengkap}`}
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-corporate border border-border text-slate-500 transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                            onClick={() => openEditModal(item)}
                            aria-label={`Ubah ${item.nama_lengkap}`}
                          >
                            <Edit className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-corporate border border-border text-slate-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item.id}
                            aria-label={`Hapus ${item.nama_lengkap}`}
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
          totalItems={filteredItems.length}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          rowsPerPage={ROWS_PER_PAGE}
          itemLabel="penduduk"
        />
      </div>

      {modalMode ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 p-4">
          <div className="card modal-content w-full max-w-3xl border border-border/80 bg-surface">
            <div className="flex items-start justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {modalMode === 'add' ? 'Tambah Data Penduduk' : null}
                  {modalMode === 'view' ? 'Detail Penduduk' : null}
                  {modalMode === 'edit' ? 'Ubah Data Penduduk' : null}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {modalMode === 'view' ? 'Data ditampilkan dalam mode baca saja.' : 'Lengkapi data sesuai dokumen resmi.'}
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">NIK</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 font-mono text-sm text-slate-700">
                    {selectedItem.nik}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nama Lengkap</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {selectedItem.nama_lengkap}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pekerjaan</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {selectedItem.pekerjaan}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {selectedItem.status}
                  </div>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alamat</p>
                  <div className="min-h-24 rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {selectedItem.alamat}
                  </div>
                </div>
              </div>
            ) : null}

            {isFormModal ? (
              <form className="px-6 py-6" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">NIK</span>
                    <input
                      className="input-field font-mono"
                      value={form.nik}
                      maxLength={16}
                      required
                      onChange={(event) => updateForm('nik', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nama Lengkap</span>
                    <input
                      className="input-field"
                      value={form.nama_lengkap}
                      maxLength={32}
                      required
                      onChange={(event) => updateForm('nama_lengkap', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pekerjaan</span>
                    <input
                      className="input-field"
                      value={form.pekerjaan}
                      maxLength={32}
                      required
                      onChange={(event) => updateForm('pekerjaan', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
                    <select
                      className="input-field"
                      value={form.status}
                      onChange={(event) => updateForm('status', event.target.value as PendudukStatus)}
                    >
                      <option value="aktif">Aktif</option>
                      <option value="nonaktif">Nonaktif</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-sm text-slate-600 sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alamat</span>
                    <textarea
                      className="input-field min-h-24"
                      value={form.alamat}
                      required
                      maxLength={2000}
                      onChange={(event) => updateForm('alamat', event.target.value)}
                    />
                  </label>
                </div>

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
