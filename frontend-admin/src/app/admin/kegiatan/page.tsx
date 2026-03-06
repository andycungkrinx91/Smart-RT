'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Eye, Plus, SquarePen as Edit, Trash2 as Trash, X } from 'lucide-react'
import { DEFAULT_ROWS_PER_PAGE, TablePagination } from '@/components/table/TablePagination'
import { fetchWithAuth } from '@/lib/client-api'
import { getUserFriendlyApiError, toUserFriendlyMessage } from '@/lib/user-friendly-error'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { ToastContainer, useToast } from '@/components/ui/Toast'

type KegiatanStatus = 'terjadwal' | 'berlangsung' | 'selesai' | 'dibatalkan'

type KegiatanItem = {
  id: number
  nama_kegiatan: string
  tanggal_kegiatan: string
  lokasi: string
  penanggung_jawab: string
  keterangan: string | null
  status: KegiatanStatus
  created_at: string
}

type KegiatanForm = {
  nama_kegiatan: string
  tanggal_kegiatan: string
  lokasi: string
  penanggung_jawab: string
  status: KegiatanStatus
  keterangan: string
}

const emptyForm: KegiatanForm = {
  nama_kegiatan: '',
  tanggal_kegiatan: '',
  lokasi: '',
  penanggung_jawab: '',
  status: 'terjadwal',
  keterangan: '',
}

const ROWS_PER_PAGE = DEFAULT_ROWS_PER_PAGE

function formatDateTime(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}

function toDatetimeLocal(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }
  // Format: YYYY-MM-DDTHH:mm
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
}

function statusBadgeClass(status: KegiatanStatus) {
  if (status === 'berlangsung') {
    return 'status-badge bg-emerald-100 text-emerald-700 border-emerald-200'
  }
  if (status === 'selesai') {
    return 'status-badge bg-slate-100 text-slate-700 border-slate-200'
  }
  if (status === 'dibatalkan') {
    return 'status-badge status-badge-inactive'
  }

  return 'status-badge bg-blue-100 text-blue-700 border-blue-200'
}

function statusLabel(status: KegiatanStatus) {
  if (status === 'berlangsung') return 'Berlangsung'
  if (status === 'selesai') return 'Selesai'
  if (status === 'dibatalkan') return 'Dibatalkan'
  return 'Terjadwal'
}

function toForm(item: KegiatanItem): KegiatanForm {
  return {
    nama_kegiatan: item.nama_kegiatan,
    tanggal_kegiatan: toDatetimeLocal(item.tanggal_kegiatan),
    lokasi: item.lokasi,
    penanggung_jawab: item.penanggung_jawab,
    status: item.status,
    keterangan: item.keterangan ?? '',
  }
}

export default function KegiatanPage() {
  const [items, setItems] = useState<KegiatanItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [formErrorMessage, setFormErrorMessage] = useState('')

  // ── Toast system ──────────────────────────────────────────────────────────
  const { toasts, showToast, dismissToast } = useToast()

  // ── Confirm-delete modal state ────────────────────────────────────────────
  const [confirmTarget, setConfirmTarget] = useState<KegiatanItem | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | KegiatanStatus>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const [selectedItem, setSelectedItem] = useState<KegiatanItem | null>(null)
  const [modalMode, setModalMode] = useState<'add' | 'view' | 'edit' | null>(null)
  const [form, setForm] = useState<KegiatanForm>(emptyForm)

  const isViewMode = modalMode === 'view'
  const isFormModal = modalMode === 'add' || modalMode === 'edit'

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)

      try {
        const response = await fetchWithAuth('/api/kegiatan', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(await getUserFriendlyApiError(response, 'Maaf, data jadwal kegiatan belum bisa dimuat.'))
        }

        const data = (await response.json()) as KegiatanItem[]
        setItems(data)
      } catch (error) {
        showToast(
          'error',
          toUserFriendlyMessage(
            error instanceof Error ? error.message : null,
            'Maaf, data jadwal kegiatan belum bisa dimuat.',
          ),
        )
      } finally {
        setIsLoading(false)
      }
    }

    void fetchData()
  }, [showToast])

  const filteredRows = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()

    return items.filter((item) => {
      const bySearch =
        normalized.length === 0 ||
        item.nama_kegiatan.toLowerCase().includes(normalized) ||
        item.lokasi.toLowerCase().includes(normalized) ||
        item.penanggung_jawab.toLowerCase().includes(normalized)

      const byStatus = statusFilter === 'all' || item.status === statusFilter

      return bySearch && byStatus
    })
  }, [items, searchTerm, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE))

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE
    return filteredRows.slice(start, start + ROWS_PER_PAGE)
  }, [filteredRows, currentPage])

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

  const openViewModal = (item: KegiatanItem) => {
    setFormErrorMessage('')
    setSelectedItem(item)
    setForm(toForm(item))
    setModalMode('view')
  }

  const openEditModal = (item: KegiatanItem) => {
    setFormErrorMessage('')
    setSelectedItem(item)
    setForm(toForm(item))
    setModalMode('edit')
  }

  const updateForm = <K extends keyof KegiatanForm>(key: K, value: KegiatanForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormErrorMessage('')
    setIsSaving(true)

    try {
      const isEdit = modalMode === 'edit' && selectedItem
      const payload = isEdit ? { id: selectedItem.id, ...form } : form

      const response = await fetchWithAuth('/api/kegiatan', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(await getUserFriendlyApiError(response, 'Maaf, terjadi kendala saat menyimpan data kegiatan.'))
      }

      const saved = (await response.json()) as KegiatanItem
      if (isEdit) {
        setItems((prev) => prev.map((item) => (item.id === saved.id ? saved : item)))
        showToast('success', `Data kegiatan "${saved.nama_kegiatan}" berhasil diperbarui.`)
      } else {
        setItems((prev) => [saved, ...prev])
        setCurrentPage(1)
        showToast('success', `Data kegiatan "${saved.nama_kegiatan}" berhasil ditambahkan.`)
      }
      closeModal()
    } catch (error) {
      setFormErrorMessage(
        toUserFriendlyMessage(
          error instanceof Error ? error.message : null,
          'Maaf, terjadi kendala saat menyimpan data kegiatan.',
        ),
      )
    } finally {
      setIsSaving(false)
    }
  }

  /** Opens the confirmation modal — actual deletion happens in handleConfirmDelete */
  const handleDelete = (item: KegiatanItem) => {
    setConfirmTarget(item)
  }

  /** Called when the user clicks "Ya, Hapus" inside ConfirmModal */
  const handleConfirmDelete = async () => {
    if (!confirmTarget) return

    const target = confirmTarget
    setDeletingId(target.id)

    try {
      const response = await fetchWithAuth(`/api/kegiatan?id=${target.id}`, { method: 'DELETE' })
      if (!response.ok) {
        throw new Error(await getUserFriendlyApiError(response, 'Maaf, data kegiatan belum bisa dihapus sekarang.'))
      }

      setItems((prev) => prev.filter((row) => row.id !== target.id))
      setConfirmTarget(null)
      showToast('success', `Data kegiatan "${target.nama_kegiatan}" berhasil dihapus.`)
    } catch (error) {
      setConfirmTarget(null)
      showToast(
        'error',
        toUserFriendlyMessage(
          error instanceof Error ? error.message : null,
          'Maaf, data kegiatan belum bisa dihapus sekarang.',
        ),
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Toast portal ──────────────────────────────────────────────────── */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* ── Confirm-delete modal ──────────────────────────────────────────── */}
      <ConfirmModal
        open={confirmTarget !== null}
        title="Hapus Data Kegiatan"
        description={
          confirmTarget
            ? `Apakah kamu mau menghapus data kegiatan "${confirmTarget.nama_kegiatan}"?`
            : 'Apakah kamu mau menghapus data ini?'
        }
        isLoading={deletingId !== null}
        onConfirm={() => { void handleConfirmDelete() }}
        onCancel={() => setConfirmTarget(null)}
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Jadwal Kegiatan</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola jadwal kegiatan warga dengan proses tambah, lihat, ubah, dan hapus.</p>
        </div>
        <button type="button" className="btn-primary gap-2" onClick={openAddModal}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tambah Data
        </button>
      </div>

      <div className="card p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cari Kegiatan</span>
            <input
              className="input-field"
              placeholder="Cari nama kegiatan, lokasi, atau PIC"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value)
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
                setStatusFilter(event.target.value as 'all' | KegiatanStatus)
                setCurrentPage(1)
              }}
            >
              <option value="all">Semua Status</option>
              <option value="terjadwal">Terjadwal</option>
              <option value="berlangsung">Berlangsung</option>
              <option value="selesai">Selesai</option>
              <option value="dibatalkan">Dibatalkan</option>
            </select>
          </label>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm text-slate-700">
            <thead className="border-b border-border bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Kegiatan</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Lokasi</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Penanggung Jawab</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-6 py-10 text-center text-sm text-slate-500" colSpan={6}>
                    Memuat jadwal kegiatan...
                  </td>
                </tr>
              ) : null}

              {!isLoading && filteredRows.length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-center text-sm text-slate-500" colSpan={6}>
                    Tidak ada jadwal kegiatan yang cocok dengan filter.
                  </td>
                </tr>
              ) : null}

              {!isLoading
                ? paginatedRows.map((item) => (
                    <tr key={item.id} className="border-t border-border transition-colors hover:bg-primary/[0.04]">
                      <td className="px-6 py-4 font-semibold text-slate-900">{item.nama_kegiatan}</td>
                      <td className="px-6 py-4 text-slate-600">{formatDateTime(item.tanggal_kegiatan)}</td>
                      <td className="px-6 py-4 text-slate-600">{item.lokasi}</td>
                      <td className="px-6 py-4 text-slate-600">{item.penanggung_jawab}</td>
                      <td className="px-6 py-4">
                        <span className={statusBadgeClass(item.status)}>{statusLabel(item.status)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-corporate border border-border text-slate-500 transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                            onClick={() => openViewModal(item)}
                            aria-label={`Lihat ${item.nama_kegiatan}`}
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-corporate border border-border text-slate-500 transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                            onClick={() => openEditModal(item)}
                            aria-label={`Ubah ${item.nama_kegiatan}`}
                          >
                            <Edit className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-corporate border border-border text-slate-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item.id}
                            aria-label={`Hapus ${item.nama_kegiatan}`}
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
          itemLabel="kegiatan"
        />
      </div>

      {modalMode ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 p-4">
          <div className="card modal-content w-full max-w-3xl border border-border/80 bg-surface">
            <div className="flex items-start justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {modalMode === 'add' ? 'Tambah Data Kegiatan' : null}
                  {modalMode === 'view' ? 'Detail Kegiatan' : null}
                  {modalMode === 'edit' ? 'Ubah Data Kegiatan' : null}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {modalMode === 'view' ? 'Data ditampilkan dalam mode baca saja.' : 'Lengkapi data kegiatan dengan benar.'}
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
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nama Kegiatan</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {selectedItem.nama_kegiatan}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal Kegiatan</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {formatDateTime(selectedItem.tanggal_kegiatan)}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lokasi</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {selectedItem.lokasi}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Penanggung Jawab</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {selectedItem.penanggung_jawab}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    <span className={statusBadgeClass(selectedItem.status)}>{statusLabel(selectedItem.status)}</span>
                  </div>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Keterangan</p>
                  <div className="min-h-16 rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {selectedItem.keterangan || '-'}
                  </div>
                </div>
              </div>
            ) : null}

            {isFormModal ? (
              <form className="px-6 py-6" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm text-slate-600 sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nama Kegiatan</span>
                    <input
                      className="input-field"
                      value={form.nama_kegiatan}
                      maxLength={255}
                      required
                      onChange={(event) => updateForm('nama_kegiatan', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal Kegiatan</span>
                    <input
                      type="datetime-local"
                      className="input-field"
                      value={form.tanggal_kegiatan}
                      required
                      onChange={(event) => updateForm('tanggal_kegiatan', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lokasi</span>
                    <input
                      className="input-field"
                      value={form.lokasi}
                      maxLength={255}
                      required
                      onChange={(event) => updateForm('lokasi', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Penanggung Jawab</span>
                    <input
                      className="input-field"
                      value={form.penanggung_jawab}
                      maxLength={255}
                      required
                      onChange={(event) => updateForm('penanggung_jawab', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
                    <select
                      className="input-field"
                      value={form.status}
                      onChange={(event) => updateForm('status', event.target.value as KegiatanStatus)}
                    >
                      <option value="terjadwal">Terjadwal</option>
                      <option value="berlangsung">Berlangsung</option>
                      <option value="selesai">Selesai</option>
                      <option value="dibatalkan">Dibatalkan</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-sm text-slate-600 sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Keterangan</span>
                    <textarea
                      className="input-field min-h-24"
                      value={form.keterangan}
                      maxLength={2000}
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
