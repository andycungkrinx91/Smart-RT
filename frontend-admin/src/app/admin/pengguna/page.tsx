'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Edit, Eye, Plus, Trash, X } from 'lucide-react'
import { DEFAULT_ROWS_PER_PAGE, TablePagination } from '@/components/table/TablePagination'
import { fetchWithAuth } from '@/lib/client-api'
import { getUserFriendlyApiError, toUserFriendlyMessage } from '@/lib/user-friendly-error'

type UserRole = 'Administrator' | 'Management'

type UserItem = {
  userid: number
  name: string
  email: string
  role: UserRole
  isLogin: boolean
  created_at: string
}

type UserForm = {
  name: string
  email: string
  password: string
  role: UserRole
}

const emptyForm: UserForm = {
  name: '',
  email: '',
  password: '',
  role: 'Management',
}

const ROWS_PER_PAGE = DEFAULT_ROWS_PER_PAGE

function roleBadgeClass(role: UserRole) {
  if (role === 'Administrator') {
    return 'status-badge bg-amber-100 text-amber-700 border-amber-200'
  }

  return 'status-badge bg-blue-100 text-blue-700 border-blue-200'
}

function loginBadgeClass(isLogin: boolean) {
  if (isLogin) {
    return 'status-badge status-badge-active'
  }

  return 'status-badge status-badge-inactive'
}

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

function toForm(item: UserItem): UserForm {
  return {
    name: item.name,
    email: item.email,
    password: '',
    role: item.role,
  }
}

export default function PenggunaPage() {
  const [items, setItems] = useState<UserItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const [nameFilter, setNameFilter] = useState('')
  const [emailFilter, setEmailFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const [selectedItem, setSelectedItem] = useState<UserItem | null>(null)
  const [modalMode, setModalMode] = useState<'add' | 'view' | 'edit' | null>(null)
  const [form, setForm] = useState<UserForm>(emptyForm)

  const isViewMode = modalMode === 'view'
  const isFormModal = modalMode === 'add' || modalMode === 'edit'

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await fetchWithAuth('/api/users', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(await getUserFriendlyApiError(response, 'Maaf, data pengguna belum bisa dimuat.'))
        }

        const data = (await response.json()) as UserItem[]
        setItems(data)
      } catch (error) {
        setErrorMessage(toUserFriendlyMessage(error instanceof Error ? error.message : null, 'Maaf, data pengguna belum bisa dimuat.'))
      } finally {
        setIsLoading(false)
      }
    }

    void fetchData()
  }, [])

  const filteredItems = useMemo(() => {
    const normalizedName = nameFilter.trim().toLowerCase()
    const normalizedEmail = emailFilter.trim().toLowerCase()

    return items.filter((item) => {
      const byName = normalizedName.length === 0 || item.name.toLowerCase().includes(normalizedName)
      const byEmail = normalizedEmail.length === 0 || item.email.toLowerCase().includes(normalizedEmail)
      const byRole = roleFilter === 'all' || item.role === roleFilter
      return byName && byEmail && byRole
    })
  }, [items, nameFilter, emailFilter, roleFilter])

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

  const openViewModal = (item: UserItem) => {
    setErrorMessage('')
    setSelectedItem(item)
    setForm(toForm(item))
    setModalMode('view')
  }

  const openEditModal = (item: UserItem) => {
    setErrorMessage('')
    setSelectedItem(item)
    setForm(toForm(item))
    setModalMode('edit')
  }

  const updateForm = <K extends keyof UserForm>(key: K, value: UserForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setIsSaving(true)

    try {
      const normalizedPassword = form.password.trim()
      const isEdit = modalMode === 'edit' && selectedItem

      if (!isEdit && normalizedPassword.length < 8) {
        throw new Error('Password minimal 8 karakter.')
      }

      const payload = isEdit
        ? {
            userid: selectedItem.userid,
            name: form.name,
            email: form.email,
            role: form.role,
            ...(normalizedPassword.length > 0 ? { password: normalizedPassword } : {}),
          }
        : {
            name: form.name,
            email: form.email,
            password: normalizedPassword,
            role: form.role,
          }

      const response = await fetchWithAuth('/api/users', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(await getUserFriendlyApiError(response, 'Maaf, terjadi kendala saat menyimpan data pengguna.'))
      }

      const saved = (await response.json()) as UserItem
      if (isEdit) {
        setItems((prev) => prev.map((item) => (item.userid === saved.userid ? saved : item)))
      } else {
        setItems((prev) => [saved, ...prev])
        setCurrentPage(1)
      }
      closeModal()
    } catch (error) {
      setErrorMessage(toUserFriendlyMessage(error instanceof Error ? error.message : null, 'Maaf, terjadi kendala saat menyimpan data pengguna.'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (item: UserItem) => {
    if (!window.confirm(`Hapus data pengguna ${item.name}?`)) {
      return
    }

    setErrorMessage('')
    setDeletingId(item.userid)

    try {
      const response = await fetchWithAuth(`/api/users?userid=${item.userid}`, { method: 'DELETE' })
      if (!response.ok) {
        throw new Error(await getUserFriendlyApiError(response, 'Maaf, data pengguna belum bisa dihapus sekarang.'))
      }

      setItems((prev) => prev.filter((row) => row.userid !== item.userid))
    } catch (error) {
      setErrorMessage(toUserFriendlyMessage(error instanceof Error ? error.message : null, 'Maaf, data pengguna belum bisa dihapus sekarang.'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Data Pengguna</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola akun admin dan management untuk akses dashboard Smart-RT.</p>
        </div>
        <button type="button" className="btn-primary gap-2" onClick={openAddModal}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tambah User
        </button>
      </div>

      <div className="card p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filter Nama</span>
            <input
              className="input-field"
              placeholder="Cari nama pengguna"
              value={nameFilter}
              onChange={(event) => {
                setNameFilter(event.target.value)
                setCurrentPage(1)
              }}
            />
          </label>
          <label className="space-y-1 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filter Email</span>
            <input
              className="input-field"
              placeholder="Cari email"
              value={emailFilter}
              onChange={(event) => {
                setEmailFilter(event.target.value)
                setCurrentPage(1)
              }}
            />
          </label>
          <label className="space-y-1 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filter Role</span>
            <select
              className="input-field"
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value as 'all' | UserRole)
                setCurrentPage(1)
              }}
            >
              <option value="all">Semua Role</option>
              <option value="Administrator">Administrator</option>
              <option value="Management">Management</option>
            </select>
          </label>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-corporate border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
      ) : null}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm text-slate-700">
            <thead className="border-b border-border bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status Login</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-6 py-10 text-center text-sm text-slate-500" colSpan={5}>
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : null}

              {!isLoading && filteredItems.length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-center text-sm text-slate-500" colSpan={5}>
                    Tidak ada data pengguna yang cocok dengan filter.
                  </td>
                </tr>
              ) : null}

              {!isLoading
                ? paginatedItems.map((item) => (
                    <tr key={item.userid} className="border-t border-border transition-colors hover:bg-primary/[0.04]">
                      <td className="px-6 py-4 font-semibold text-slate-900">{item.name}</td>
                      <td className="px-6 py-4 text-slate-600">{item.email}</td>
                      <td className="px-6 py-4">
                        <span className={roleBadgeClass(item.role)}>{item.role}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={loginBadgeClass(item.isLogin)}>{item.isLogin ? 'Online' : 'Offline'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-corporate border border-border text-slate-500 transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                            onClick={() => openViewModal(item)}
                            aria-label={`Lihat ${item.name}`}
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-corporate border border-border text-slate-500 transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                            onClick={() => openEditModal(item)}
                            aria-label={`Ubah ${item.name}`}
                          >
                            <Edit className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-corporate border border-border text-slate-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item.userid}
                            aria-label={`Hapus ${item.name}`}
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
          itemLabel="pengguna"
        />
      </div>

      {modalMode ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 p-4">
          <div className="card modal-content w-full max-w-3xl border border-border/80 bg-surface">
            <div className="flex items-start justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {modalMode === 'add' ? 'Tambah Data Pengguna' : null}
                  {modalMode === 'view' ? 'Detail Pengguna' : null}
                  {modalMode === 'edit' ? 'Update Data Pengguna' : null}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {modalMode === 'view' ? 'Data ditampilkan dalam mode baca saja.' : 'Pastikan email dan role sesuai kebutuhan akses.'}
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nama</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {selectedItem.name}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {selectedItem.email}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {selectedItem.role}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status Login</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {selectedItem.isLogin ? 'Online' : 'Offline'}
                  </div>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dibuat Pada</p>
                  <div className="rounded-corporate border border-border bg-background px-3 py-2 text-sm text-slate-700">
                    {formatDateTime(selectedItem.created_at)}
                  </div>
                </div>
              </div>
            ) : null}

            {isFormModal ? (
              <form className="px-6 py-6" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nama</span>
                    <input
                      className="input-field"
                      value={form.name}
                      maxLength={64}
                      required
                      onChange={(event) => updateForm('name', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</span>
                    <input
                      type="email"
                      className="input-field"
                      value={form.email}
                      maxLength={255}
                      required
                      onChange={(event) => updateForm('email', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</span>
                    <select
                      className="input-field"
                      value={form.role}
                      onChange={(event) => updateForm('role', event.target.value as UserRole)}
                    >
                      <option value="Administrator">Administrator</option>
                      <option value="Management">Management</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Password</span>
                    <input
                      type="password"
                      className="input-field"
                      value={form.password}
                      minLength={modalMode === 'add' ? 8 : undefined}
                      required={modalMode === 'add'}
                      placeholder={modalMode === 'edit' ? 'Kosongkan jika tidak diubah' : 'Minimal 8 karakter'}
                      onChange={(event) => updateForm('password', event.target.value)}
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
