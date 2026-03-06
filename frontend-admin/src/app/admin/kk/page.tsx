'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Edit, Eye, Plus, Trash, X } from 'lucide-react'
import { TablePagination } from '@/components/table/TablePagination'
import { fetchWithAuth } from '@/lib/client-api'
import { getUserFriendlyApiError, toUserFriendlyMessage } from '@/lib/user-friendly-error'

type KKStatusWarga = 'permanen' | 'pendatang' | 'nonaktif'

type KKItem = {
  id: number
  no_kk: string
  nik: string
  nama_kepala_keluarga: string
  alamat: string
  rt: string
  rw: string
  kelurahan: string
  kecamatan: string
  kabupaten: string
  kodepos: string
  status_warga: KKStatusWarga
  asal_kota: string
  created_at: string
}

type KKForm = {
  no_kk: string
  nik: string
  nama_kepala_keluarga: string
  alamat: string
  rt: string
  rw: string
  kelurahan: string
  kecamatan: string
  kabupaten: string
  kodepos: string
  status_warga: KKStatusWarga
  asal_kota: string
}

type SortOrder = 'asc' | 'desc'

type SortConfig = {
  key: string
  order: SortOrder
}

const emptyForm: KKForm = {
  no_kk: '',
  nik: '',
  nama_kepala_keluarga: '',
  alamat: '',
  rt: '',
  rw: '',
  kelurahan: '',
  kecamatan: '',
  kabupaten: '',
  kodepos: '',
  status_warga: 'permanen',
  asal_kota: '',
}

const ROWS_PER_PAGE = 20

const statusWargaLabel: Record<KKStatusWarga, string> = {
  'permanen': 'Permanen',
  'pendatang': 'Pendatang',
  'nonaktif': 'Nonaktif'
}

function toForm(item: KKItem): KKForm {
  return {
    no_kk: item.no_kk,
    nik: item.nik,
    nama_kepala_keluarga: item.nama_kepala_keluarga,
    alamat: item.alamat,
    rt: item.rt,
    rw: item.rw,
    kelurahan: item.kelurahan,
    kecamatan: item.kecamatan,
    kabupaten: item.kabupaten,
    kodepos: item.kodepos,
    status_warga: item.status_warga.toLowerCase() as KKStatusWarga,
    asal_kota: item.asal_kota,
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

export default function KKPage() {
  const [items, setItems] = useState<KKItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const [nameFilter, setNameFilter] = useState('')
  const [identityFilter, setIdentityFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // ── Sort state ────────────────────────────────────────────────────────────
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id', order: 'desc' })

  const [selectedItem, setSelectedItem] = useState<KKItem | null>(null)
  const [modalMode, setModalMode] = useState<'add' | 'view' | 'edit' | null>(null)
  const [form, setForm] = useState<KKForm>(emptyForm)

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

      const response = await fetchWithAuth(`/api/kk?${params.toString()}`, { cache: 'no-store' })
      if (!response.ok) {
        throw new Error(await getUserFriendlyApiError(response, 'Maaf, data kartu keluarga belum bisa dimuat.'))
      }

      const data = (await response.json()) as KKItem[]
      // Convert status_warga to lowercase for frontend
      const normalizedData = data.map((item) => ({ ...item, status_warga: item.status_warga.toLowerCase() as KKStatusWarga }))
      setItems(normalizedData)
    } catch (error) {
      setErrorMessage(toUserFriendlyMessage(error instanceof Error ? error.message : null, 'Maaf, data kartu keluarga belum bisa dimuat.'))
    } finally {
      setIsLoading(false)
    }
  }, [sortConfig])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const filteredItems = useMemo(() => {
    const normalizedName = nameFilter.trim().toLowerCase()
    const normalizedIdentity = identityFilter.trim().toLowerCase()

    return items.filter((item) => {
      const byName = normalizedName.length === 0 || item.nama_kepala_keluarga.toLowerCase().includes(normalizedName)
      const byIdentity =
        normalizedIdentity.length === 0 ||
        item.no_kk.toLowerCase().includes(normalizedIdentity) ||
        item.nik.toLowerCase().includes(normalizedIdentity)
      return byName && byIdentity
    })
  }, [items, nameFilter, identityFilter])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ROWS_PER_PAGE))

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE
    return filteredItems.slice(start, start + ROWS_PER_PAGE)
  }, [filteredItems, currentPage])

  useEffect(() => {
    setCurrentPage((previousPage) => Math.min(previousPage, totalPages))
  }, [totalPages])

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

  const openViewModal = (item: KKItem) => {
    setErrorMessage('')
    setSelectedItem(item)
    setForm(toForm(item))
    setModalMode('view')
  }

  const openEditModal = (item: KKItem) => {
    setErrorMessage('')
    setSelectedItem(item)
    setForm(toForm(item))
    setModalMode('edit')
  }

  const updateForm = <K extends keyof KKForm>(key: K, value: KKForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setIsSaving(true)

    try {
      const isEdit = modalMode === 'edit' && selectedItem

      // Convert status_warga to proper case for backend
      const statusWargaMap: Record<KKStatusWarga, string> = {
        'permanen': 'Permanen',
        'pendatang': 'Pendatang',
        'nonaktif': 'Nonaktif'
      }
      const normalizedForm = {
        ...form,
        status_warga: statusWargaMap[form.status_warga]
      }
      const payload = isEdit ? { id: selectedItem.id, ...normalizedForm } : normalizedForm

      const response = await fetchWithAuth('/api/kk', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(await getUserFriendlyApiError(response, 'Maaf, terjadi kendala saat menyimpan data kartu keluarga.'))
      }

      const saved = (await response.json()) as KKItem
      // Convert status_warga to lowercase for frontend
      const normalizedSaved = { ...saved, status_warga: saved.status_warga.toLowerCase() as KKStatusWarga }
      if (isEdit) {
        setItems((prev) => prev.map((item) => (item.id === normalizedSaved.id ? normalizedSaved : item)))
      } else {
        setItems((prev) => [normalizedSaved, ...prev])
        setCurrentPage(1)
      }
      closeModal()
    } catch (error) {
      setErrorMessage(toUserFriendlyMessage(error instanceof Error ? error.message : null, 'Maaf, terjadi kendala saat menyimpan data kartu keluarga.'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (item: KKItem) => {
    if (!window.confirm(`Hapus data kartu keluarga ${item.nama_kepala_keluarga}?`)) {
      return
    }

    setErrorMessage('')
    setDeletingId(item.id)

    try {
      const response = await fetchWithAuth(`/api/kk?id=${item.id}`, { method: 'DELETE' })
      if (!response.ok) {
        throw new Error(await getUserFriendlyApiError(response, 'Maaf, data kartu keluarga belum bisa dihapus sekarang.'))
      }

      setItems((prev) => prev.filter((row) => row.id !== item.id))
    } catch (error) {
      setErrorMessage(toUserFriendlyMessage(error instanceof Error ? error.message : null, 'Maaf, data kartu keluarga belum bisa dihapus sekarang.'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Data Kartu Keluarga</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola data KK untuk kebutuhan administrasi RT secara terpusat.</p>
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
              placeholder="Cari nama kepala keluarga"
              value={nameFilter}
              onChange={(event) => {
                setNameFilter(event.target.value)
                setCurrentPage(1)
              }}
            />
          </label>
          <label className="space-y-1 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cari NIK / No KK</span>
            <input
              className="input-field"
              placeholder="Cari NIK atau No KK"
              value={identityFilter}
              onChange={(event) => {
                setIdentityFilter(event.target.value)
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
          <table className="min-w-[1160px] w-full text-sm text-slate-700">
            <thead className="border-b border-border bg-background">
              <tr>
                <th
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-primary"
                  onClick={() => handleSort('no_kk')}
                  aria-sort={sortConfig.key === 'no_kk' ? (sortConfig.order === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  No KK
                  <SortIcon columnKey="no_kk" sortConfig={sortConfig} />
                </th>
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
                  onClick={() => handleSort('nama_kepala_keluarga')}
                  aria-sort={sortConfig.key === 'nama_kepala_keluarga' ? (sortConfig.order === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Kepala Keluarga
                  <SortIcon columnKey="nama_kepala_keluarga" sortConfig={sortConfig} />
                </th>
                <th
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-primary"
                  onClick={() => handleSort('rt')}
                  aria-sort={sortConfig.key === 'rt' ? (sortConfig.order === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  RT/RW
                  <SortIcon columnKey="rt" sortConfig={sortConfig} />
                </th>
                <th
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-primary"
                  onClick={() => handleSort('kelurahan')}
                  aria-sort={sortConfig.key === 'kelurahan' ? (sortConfig.order === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Kelurahan
                  <SortIcon columnKey="kelurahan" sortConfig={sortConfig} />
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status Warga</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</th>
              </tr>
            </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td className="px-6 py-10 text-center text-sm text-slate-500" colSpan={7}>
                        Memuat data kartu keluarga...
                      </td>
                    </tr>
                  ) : null}

                  {!isLoading && filteredItems.length === 0 ? (
                    <tr>
                      <td className="px-6 py-10 text-center text-sm text-slate-500" colSpan={7}>
                        Tidak ada data kartu keluarga yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : null}

              {!isLoading
                ? paginatedItems.map((item) => (
                    <tr key={item.id} className="border-t border-border transition-colors hover:bg-primary/[0.04]">
                      <td className="px-6 py-4 font-mono text-xs text-slate-600">{item.no_kk}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-600">{item.nik}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{item.nama_kepala_keluarga}</td>
                      <td className="px-6 py-4">{item.rt}/{item.rw}</td>
                      <td className="px-6 py-4">{item.kelurahan}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          item.status_warga === 'permanen' 
                            ? 'bg-green-100 text-green-800' 
                            : item.status_warga === 'pendatang'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {statusWargaLabel[item.status_warga]}
                        </span>
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
          itemLabel="kartu keluarga"
        />
      </div>

      {modalMode ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 p-4">
          <div className="card modal-content w-full max-w-5xl border border-border/80 bg-surface">
            <div className="flex items-start justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {modalMode === 'add' ? 'Tambah Data Kartu Keluarga' : null}
                  {modalMode === 'view' ? 'Detail Kartu Keluarga' : null}
                  {modalMode === 'edit' ? 'Ubah Data Kartu Keluarga' : null}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {modalMode === 'view' ? 'Data ditampilkan dalam mode baca saja.' : 'Pastikan data KK sesuai dokumen resmi.'}
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
              <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">No KK</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 font-mono text-sm text-slate-700">
                    {selectedItem.no_kk}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">NIK</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 font-mono text-sm text-slate-700">
                    {selectedItem.nik}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kepala Keluarga</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {selectedItem.nama_kepala_keluarga}
                  </div>
                </div>
                <div className="space-y-1 lg:col-span-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alamat</p>
                  <div className="min-h-24 rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {selectedItem.alamat}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">RT</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {selectedItem.rt}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">RW</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {selectedItem.rw}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kode Pos</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {selectedItem.kodepos}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kelurahan</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {selectedItem.kelurahan}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kecamatan</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {selectedItem.kecamatan}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kabupaten</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {selectedItem.kabupaten}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status Warga</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {statusWargaLabel[selectedItem.status_warga] || selectedItem.status_warga}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Asal Kota</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {selectedItem.asal_kota}
                  </div>
                </div>
              </div>
            ) : null}

            {isFormModal ? (
              <form className="px-6 py-6" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">No KK</span>
                    <input
                      className="input-field font-mono"
                      value={form.no_kk}
                      maxLength={16}
                      required
                      onChange={(event) => updateForm('no_kk', event.target.value)}
                    />
                  </label>
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
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kepala Keluarga</span>
                    <input
                      className="input-field"
                      value={form.nama_kepala_keluarga}
                      maxLength={16}
                      required
                      onChange={(event) => updateForm('nama_kepala_keluarga', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-600 sm:col-span-2 lg:col-span-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alamat</span>
                    <textarea
                      className="input-field min-h-24"
                      value={form.alamat}
                      maxLength={2000}
                      required
                      onChange={(event) => updateForm('alamat', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">RT</span>
                    <input
                      className="input-field"
                      value={form.rt}
                      maxLength={3}
                      required
                      onChange={(event) => updateForm('rt', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">RW</span>
                    <input
                      className="input-field"
                      value={form.rw}
                      maxLength={3}
                      required
                      onChange={(event) => updateForm('rw', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kode Pos</span>
                    <input
                      className="input-field"
                      value={form.kodepos}
                      maxLength={6}
                      required
                      onChange={(event) => updateForm('kodepos', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kelurahan</span>
                    <input
                      className="input-field"
                      value={form.kelurahan}
                      maxLength={16}
                      required
                      onChange={(event) => updateForm('kelurahan', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kecamatan</span>
                    <input
                      className="input-field"
                      value={form.kecamatan}
                      maxLength={16}
                      required
                      onChange={(event) => updateForm('kecamatan', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kabupaten</span>
                    <input
                      className="input-field"
                      value={form.kabupaten}
                      maxLength={16}
                      required
                      onChange={(event) => updateForm('kabupaten', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status Warga</span>
                    <select
                      className="input-field"
                      value={form.status_warga}
                      required
                      onChange={(event) => updateForm('status_warga', event.target.value as KKStatusWarga)}
                    >
                      <option value="permanen">Permanen</option>
                      <option value="pendatang">Pendatang</option>
                      <option value="nonaktif">Nonaktif</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Asal Kota</span>
                    <input
                      className="input-field"
                      value={form.asal_kota}
                      maxLength={16}
                      required
                      onChange={(event) => updateForm('asal_kota', event.target.value)}
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
