'use client'

import { ChangeEvent, DragEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { fetchWithAuth } from '@/lib/client-api'
import { toUserFriendlyMessage } from '@/lib/user-friendly-error'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Calendar,
  Code2,
  Eye,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  ImagePlus,
  Pencil,
  Plus,
  Quote,
  RefreshCcw,
  Trash2,
  Underline,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type BlogItem = {
  id: number
  title: string
  image_url: string | null
  content_html: string | null
  content_css: string | null
  created_by: string
  created_at: string
}

type BlogModalMode = 'create' | 'edit' | 'view' | null
type EditorTab = 'visual' | 'html'
type ToolbarButton = {
  label: string
  command: string
  value?: string
  icon: LucideIcon
}

type UploadResponse = {
  url?: unknown
  message?: unknown
}

function resolveBlogImageWidthPercent() {
  const raw = process.env.NEXT_PUBLIC_BLOG_IMAGE_WIDTH_PERCENT
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) {
    return 100
  }
  return Math.max(10, Math.min(100, Math.round(parsed)))
}

const BLOG_IMAGE_WIDTH_PERCENT = resolveBlogImageWidthPercent()
const BLOG_IMAGE_WIDTH_STYLE = `${BLOG_IMAGE_WIDTH_PERCENT}%`

function isBlogItem(value: unknown): value is BlogItem {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const item = value as Partial<BlogItem>
  return (
    typeof item.id === 'number' &&
    typeof item.title === 'string' &&
    (typeof item.image_url === 'string' || item.image_url === null) &&
    typeof item.created_by === 'string' &&
    typeof item.created_at === 'string'
  )
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function excerptFromHtml(html: string | null, maxLength = 110) {
  if (!html) {
    return '-'
  }
  const plain = stripHtml(html)
  if (!plain) {
    return '-'
  }
  if (plain.length <= maxLength) {
    return plain
  }
  return `${plain.slice(0, maxLength - 3)}...`
}

function formatDate(dateIso: string) {
  const date = new Date(dateIso)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getApiError(payload: unknown, fallback: string) {
  if (typeof payload !== 'object' || payload === null) {
    return fallback
  }

  const maybe = payload as { message?: unknown; detail?: unknown }
  if (typeof maybe.message === 'string' && maybe.message.trim()) {
    return toUserFriendlyMessage(maybe.message, fallback)
  }
  if (typeof maybe.detail === 'string' && maybe.detail.trim()) {
    return toUserFriendlyMessage(maybe.detail, fallback)
  }
  return fallback
}

const toolbarButtons: ToolbarButton[] = [
  { label: 'H2', command: 'formatBlock', value: '<h2>', icon: Heading2 },
  { label: 'Bold', command: 'bold', icon: Bold },
  { label: 'Italic', command: 'italic', icon: Italic },
  { label: 'Underline', command: 'underline', icon: Underline },
  { label: 'Align Left', command: 'justifyLeft', icon: AlignLeft },
  { label: 'Align Center', command: 'justifyCenter', icon: AlignCenter },
  { label: 'Align Right', command: 'justifyRight', icon: AlignRight },
  { label: 'Justify', command: 'justifyFull', icon: AlignJustify },
  { label: 'Bullet List', command: 'insertUnorderedList', icon: List },
  { label: 'Numbered List', command: 'insertOrderedList', icon: ListOrdered },
  { label: 'Quote', command: 'formatBlock', value: '<blockquote>', icon: Quote },
]

const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
}

const modalVariants: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 260, damping: 24 },
  },
  exit: { opacity: 0, y: 18, scale: 0.97, transition: { duration: 0.18 } },
}

export default function BlogPage() {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)

  const [blogs, setBlogs] = useState<BlogItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const [modalMode, setModalMode] = useState<BlogModalMode>(null)
  const [selectedBlog, setSelectedBlog] = useState<BlogItem | null>(null)
  const [editorTab, setEditorTab] = useState<EditorTab>('visual')
  const [title, setTitle] = useState('')
  const [visualContent, setVisualContent] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [isDraggingImages, setIsDraggingImages] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const isEditorMode = modalMode === 'create' || modalMode === 'edit'

  const [featuredImage, setFeaturedImage] = useState<string | null>(null)

  const resetModalState = useCallback(() => {
    setModalMode(null)
    setSelectedBlog(null)
    setFormError(null)
    setUploadError(null)
    setIsDraggingImages(false)
    setIsUploadingImage(false)
    setFeaturedImage(null)
  }, [])

  const closeModal = useCallback(() => {
    if (isSaving) {
      return
    }
    resetModalState()
  }, [isSaving, resetModalState])

  const loadBlogs = useCallback(async (showRefreshing = false) => {
    setListError(null)
    if (showRefreshing) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    try {
      const response = await fetchWithAuth('/api/blogs', {
        method: 'GET',
        headers: { accept: 'application/json' },
        cache: 'no-store',
      })
      const payload = (await response.json().catch(() => null)) as unknown

      if (!response.ok) {
        throw new Error(getApiError(payload, 'Maaf, data blog belum bisa dimuat.'))
      }

      if (!Array.isArray(payload)) {
        throw new Error('Maaf, data blog tidak dapat ditampilkan saat ini.')
      }

      const safeBlogs = payload.filter(isBlogItem)
      setBlogs(safeBlogs)
    } catch (err) {
      setListError(toUserFriendlyMessage(err instanceof Error ? err.message : null, 'Maaf, data blog belum bisa dimuat.'))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadBlogs()
  }, [loadBlogs])

  useEffect(() => {
    if (editorTab !== 'visual' || !editorRef.current) {
      return
    }

    if (editorRef.current.innerHTML !== visualContent) {
      editorRef.current.innerHTML = visualContent
    }
  }, [editorTab, visualContent, modalMode])

  useEffect(() => {
    if (!modalMode) {
      return
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal()
      }
    }

    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [closeModal, modalMode])

  const plainTextContent = useMemo(() => stripHtml(htmlContent), [htmlContent])
  const wordCount = useMemo(() => {
    if (!plainTextContent) {
      return 0
    }
    return plainTextContent.split(' ').filter(Boolean).length
  }, [plainTextContent])

  function openCreateModal() {
    setModalMode('create')
    setSelectedBlog(null)
    setEditorTab('visual')
    setTitle('')
    setVisualContent('')
    setHtmlContent('')
    setFormError(null)
    setUploadError(null)
    setIsDraggingImages(false)
  }

  function openViewModal(blog: BlogItem) {
    const nextHtml = blog.content_html ?? ''
    setModalMode('view')
    setSelectedBlog(blog)
    setEditorTab('visual')
    setTitle(blog.title)
    setVisualContent(nextHtml)
    setHtmlContent(nextHtml)
    setFeaturedImage(blog.image_url)
    setFormError(null)
    setUploadError(null)
  }

  function openEditModal(blog: BlogItem) {
    const nextHtml = blog.content_html ?? ''
    setModalMode('edit')
    setSelectedBlog(blog)
    setEditorTab('visual')
    setTitle(blog.title)
    setVisualContent(nextHtml)
    setHtmlContent(nextHtml)
    setFeaturedImage(blog.image_url)
    setFormError(null)
    setUploadError(null)
    setIsDraggingImages(false)
  }

  function syncEditorFromDom() {
    const currentHtml = editorRef.current?.innerHTML ?? ''
    setVisualContent(currentHtml)
    setHtmlContent(currentHtml)
  }

  function runEditorCommand(command: string, value?: string) {
    if (!isEditorMode || !editorRef.current) {
      return
    }

    editorRef.current.focus()
    const richTextDocument = document as Document & {
      execCommand?: (commandId: string, showUi?: boolean, valueArg?: string) => boolean
    }
    richTextDocument.execCommand?.(command, false, value)
    syncEditorFromDom()
  }

  function insertLink() {
    if (!isEditorMode) {
      return
    }

    const url = window.prompt('Masukkan URL tautan')
    if (!url) {
      return
    }
    runEditorCommand('createLink', url)
  }

  function insertImageToEditor(url: string, fileName: string) {
    const safeAlt = fileName.replace(/"/g, '&quot;')
    const imageHtml = `<figure class="my-6"><img src="${url}" alt="${safeAlt}" class="mx-auto block max-w-full h-auto rounded-2xl shadow-lg" style="width:${BLOG_IMAGE_WIDTH_STYLE};max-width:100%;height:auto;" /><figcaption class="mt-2 text-center text-sm text-slate-500">${fileName}</figcaption></figure>`

    if (editorTab === 'visual') {
      editorRef.current?.focus()
      const richTextDocument = document as Document & {
        execCommand?: (commandId: string, showUi?: boolean, valueArg?: string) => boolean
      }
      richTextDocument.execCommand?.('insertHTML', false, imageHtml)
      window.setTimeout(syncEditorFromDom, 0)
      return
    }

    setHtmlContent((prev) => {
      const next = `${prev}${prev.trim() ? '\n' : ''}${imageHtml}`
      setVisualContent(next)
      return next
    })
  }

  async function uploadImage(file: File) {
    if (!file.type.startsWith('image/')) {
      setUploadError('File harus berupa gambar (PNG, JPG, WEBP, atau GIF).')
      return
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setUploadError('Ukuran gambar maksimal 5MB.')
      return
    }

    setUploadError(null)
    setIsUploadingImage(true)

    try {
      const body = new FormData()
      body.append('file', file)

      const response = await fetchWithAuth('/api/blogs/upload', {
        method: 'POST',
        body,
      })
      const payload = (await response.json().catch(() => null)) as UploadResponse | null

      if (!response.ok) {
        throw new Error(getApiError(payload, 'Upload gambar gagal diproses.'))
      }

      const imageUrl = typeof payload?.url === 'string' ? payload.url : ''
      if (!imageUrl) {
        throw new Error('Upload berhasil, namun URL gambar tidak ditemukan.')
      }

      if (!featuredImage) {
        setFeaturedImage(imageUrl)
      }

      insertImageToEditor(imageUrl, file.name)
    } catch (err) {
      setUploadError(toUserFriendlyMessage(err instanceof Error ? err.message : null, 'Upload gambar gagal diproses.'))
    } finally {
      setIsUploadingImage(false)
    }
  }

  async function handleImageFiles(files: FileList | File[]) {
    if (!isEditorMode) {
      return
    }

    const picked = Array.from(files).find((file) => file.type.startsWith('image/'))
    if (!picked) {
      setUploadError('Tidak ada file gambar yang terdeteksi.')
      return
    }

    await uploadImage(picked)
  }

  function openImagePicker() {
    if (!isEditorMode) {
      return
    }
    imageInputRef.current?.click()
  }

  function onImageInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) {
      return
    }
    void handleImageFiles(files)
    event.target.value = ''
  }

  function onDropZoneDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    if (!isEditorMode) {
      return
    }
    setIsDraggingImages(true)
  }

  function onDropZoneDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    if (!isEditorMode) {
      return
    }
    event.dataTransfer.dropEffect = 'copy'
    setIsDraggingImages(true)
  }

  function onDropZoneDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDraggingImages(false)
    }
  }

  function onDropZoneDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    if (!isEditorMode) {
      return
    }
    setIsDraggingImages(false)
    void handleImageFiles(event.dataTransfer.files)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isEditorMode) {
      return
    }

    const preparedTitle = title.trim()
    const preparedHtml = (editorTab === 'visual' ? editorRef.current?.innerHTML || visualContent : htmlContent).trim()

    if (!preparedTitle) {
      setFormError('Judul wajib diisi')
      return
    }

    if (!preparedHtml) {
      setFormError('Konten blog wajib diisi')
      return
    }

    setFormError(null)
    setIsSaving(true)

    try {
      const body =
        modalMode === 'create'
          ? {
              title: preparedTitle,
              content_html: preparedHtml,
              image_url: featuredImage,
            }
          : {
              id: selectedBlog?.id,
              title: preparedTitle,
              content_html: preparedHtml,
              image_url: featuredImage,
            }

      const response = await fetchWithAuth('/api/blogs', {
        method: modalMode === 'create' ? 'POST' : 'PUT',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(body),
      })
      const payload = (await response.json().catch(() => null)) as unknown

      if (!response.ok) {
        throw new Error(getApiError(payload, 'Maaf, terjadi kendala saat menyimpan blog.'))
      }

      resetModalState()
      await loadBlogs(true)
    } catch (err) {
      setFormError(toUserFriendlyMessage(err instanceof Error ? err.message : null, 'Maaf, terjadi kendala saat menyimpan blog.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(blog: BlogItem) {
    const agreed = window.confirm(`Hapus blog "${blog.title}"? Tindakan ini tidak bisa dibatalkan.`)
    if (!agreed) {
      return
    }

    setDeleteId(blog.id)
    setListError(null)

    try {
      const response = await fetchWithAuth(`/api/blogs?id=${blog.id}`, {
        method: 'DELETE',
        headers: { accept: 'application/json' },
      })
      const payload = (await response.json().catch(() => null)) as unknown
      if (!response.ok) {
        throw new Error(getApiError(payload, 'Maaf, data blog belum bisa dihapus sekarang.'))
      }
      await loadBlogs(true)
    } catch (err) {
      setListError(toUserFriendlyMessage(err instanceof Error ? err.message : null, 'Maaf, data blog belum bisa dihapus sekarang.'))
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Blog Management</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola artikel, ubah konten HTML, dan publikasikan dari panel editor.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadBlogs(true)}
            className="inline-flex items-center gap-2 rounded-corporate border border-border bg-surface px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isRefreshing || isLoading}
          >
            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCcw className="h-4 w-4" aria-hidden="true" />}
            Refresh
          </button>
          <button type="button" onClick={openCreateModal} className="btn-primary inline-flex items-center gap-2 px-4 py-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tambah Blog
          </button>
        </div>
      </div>

      {listError ? <p className="rounded-corporate border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{listError}</p> : null}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full text-sm text-slate-700">
            <thead className="border-b border-border bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Judul</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ringkasan</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Penulis</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-6 py-12" colSpan={5}>
                    <div className="flex items-center justify-center gap-3 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Memuat data blog...
                    </div>
                  </td>
                </tr>
              ) : blogs.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-sm text-slate-500" colSpan={5}>
                    Belum ada blog yang dipublikasikan.
                  </td>
                </tr>
              ) : (
                blogs.map((blog) => (
                  <tr key={blog.id} className="border-t border-border transition-colors hover:bg-primary/[0.04]">
                    <td className="px-6 py-4 align-top font-semibold text-slate-900">{blog.title}</td>
                    <td className="px-6 py-4 align-top text-slate-600">{excerptFromHtml(blog.content_html)}</td>
                    <td className="px-6 py-4 align-top text-slate-700">{blog.created_by}</td>
                    <td className="px-6 py-4 align-top text-slate-600">{formatDate(blog.created_at)}</td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openViewModal(blog)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-corporate border border-border text-slate-500 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                          aria-label={`Lihat blog ${blog.title}`}
                          title="Lihat"
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(blog)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-corporate border border-border text-slate-500 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                          aria-label={`Edit blog ${blog.title}`}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(blog)}
                          disabled={deleteId === blog.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-corporate border border-red-200 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={`Hapus blog ${blog.title}`}
                          title="Hapus"
                        >
                          {deleteId === blog.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {modalMode ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 sm:p-6"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={closeModal}
          >
            <motion.div
              className="flex h-full max-h-[92vh] w-full max-w-[1420px] flex-col overflow-hidden rounded-2xl border border-primary/20 bg-[linear-gradient(180deg,#ffffff,#f8fbff)] shadow-[0_35px_90px_rgba(2,6,23,0.35)]"
              variants={modalVariants}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-primary/20 bg-[linear-gradient(120deg,rgba(30,144,255,0.14),rgba(255,255,255,0.7))] px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {modalMode === 'create' ? 'Tulis Artikel Baru' : modalMode === 'edit' ? 'Perbarui Artikel' : 'Detail Artikel'}
                  </h2>
                  <p className="mt-0.5 text-xs uppercase tracking-[0.1em] text-slate-600">Editor immersive ala WordPress</p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 text-slate-500 transition-colors hover:border-primary/40 hover:text-primary"
                  aria-label="Tutup modal"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {isEditorMode ? (
                <form onSubmit={(event) => void handleSubmit(event)} className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_320px] lg:overflow-hidden">
                  <div className="order-2 flex min-h-0 flex-col p-4 sm:p-6 lg:order-1 lg:border-r lg:border-primary/15">
                    <label className="mb-6 block">
                      <span className="mb-3 block text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Judul Artikel</span>
                      <textarea
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Mulai dengan judul yang memikat..."
                        rows={1}
                        className="w-full bg-transparent text-xl font-black tracking-tighter text-slate-900 outline-none transition-all placeholder:text-slate-200 focus:placeholder:text-slate-100 sm:text-2xl"
                        style={{ resize: 'none', overflow: 'hidden' }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement
                          target.style.height = 'auto'
                          target.style.height = `${target.scrollHeight}px`
                        }}
                      />
                    </label>

                    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/[0.05] p-2">
                      {toolbarButtons.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => runEditorCommand(item.command, item.value)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-primary/15 hover:text-primary"
                          title={item.label}
                          aria-label={item.label}
                        >
                          <item.icon className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={insertLink}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-primary/15 hover:text-primary"
                        title="Tambah tautan"
                        aria-label="Tambah tautan"
                      >
                        <Link2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={openImagePicker}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/20 px-3 text-xs font-semibold uppercase tracking-wide text-primary transition-colors hover:bg-primary/10"
                        title="Upload gambar"
                        aria-label="Upload gambar"
                      >
                        <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                        Gambar
                      </button>

                      <div className="inline-flex w-full rounded-lg border border-border bg-surface p-1 sm:ml-auto sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setEditorTab('visual')}
                          className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                            editorTab === 'visual' ? 'bg-primary text-white' : 'text-slate-600 hover:text-primary'
                          }`}
                        >
                          Visual
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditorTab('html')}
                          className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                            editorTab === 'html' ? 'bg-primary text-white' : 'text-slate-600 hover:text-primary'
                          }`}
                        >
                          <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
                          HTML
                        </button>
                      </div>
                    </div>

                    <motion.div
                      onDragEnter={onDropZoneDragEnter}
                      onDragOver={onDropZoneDragOver}
                      onDragLeave={onDropZoneDragLeave}
                      onDrop={onDropZoneDrop}
                      onClick={openImagePicker}
                      animate={
                        isUploadingImage
                          ? { scale: [1, 1.01, 1], opacity: [0.92, 1, 0.92] }
                          : isDraggingImages
                            ? { scale: 1.01, y: -2 }
                            : { scale: 1, y: 0 }
                      }
                      transition={{ duration: 0.25 }}
                      className={`mb-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-3 transition-colors ${
                        isDraggingImages
                          ? 'border-primary bg-primary/[0.13]'
                          : isUploadingImage
                            ? 'border-primary/40 bg-primary/[0.1]'
                            : 'border-primary/25 bg-primary/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        {isUploadingImage ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                        ) : (
                          <Upload className="h-4 w-4 text-primary" aria-hidden="true" />
                        )}
                        <span className="font-medium">
                          {isUploadingImage
                            ? 'Mengunggah gambar...'
                            : isDraggingImages
                              ? 'Lepaskan gambar di sini'
                              : 'Drag & drop gambar ke sini atau klik untuk pilih file'}
                        </span>
                      </div>
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Maks 5MB</span>
                    </motion.div>

                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={onImageInputChange}
                      className="hidden"
                    />

                    <div className="min-h-[340px] flex-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm ring-1 ring-slate-900/5 sm:min-h-[500px]">
                      {editorTab === 'visual' ? (
                        <div
                          ref={editorRef}
                          contentEditable
                          onInput={syncEditorFromDom}
                          className="h-full min-h-[340px] overflow-y-auto rounded-xl bg-white p-5 text-base leading-relaxed text-slate-800 outline-none transition-all focus:ring-2 focus:ring-primary/5 sm:min-h-[500px] sm:p-8 sm:text-lg prose prose-slate max-w-none [&_img]:mx-auto [&_img]:block [&_img]:max-w-full [&_img]:h-auto"
                          suppressContentEditableWarning
                        />
                      ) : (
                        <textarea
                          value={htmlContent}
                          onChange={(event) => {
                            setHtmlContent(event.target.value)
                            setVisualContent(event.target.value)
                          }}
                          className="h-full min-h-[340px] w-full resize-none rounded-xl border-none bg-slate-50 p-5 font-mono text-sm leading-relaxed text-slate-700 outline-none sm:min-h-[500px] sm:p-8"
                          spellCheck={false}
                          placeholder="Masukkan kode HTML di sini..."
                        />
                      )}
                    </div>
                  </div>

                  <aside className="order-1 space-y-4 border-b border-primary/15 bg-background/60 p-4 pb-5 sm:p-5 lg:order-2 lg:overflow-y-auto lg:border-b-0 lg:pb-6">
                    <div className="rounded-xl border border-border bg-surface p-4">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Featured Image</h3>
                      <div className="mt-3">
                        {featuredImage ? (
                          <div className="relative overflow-hidden rounded-lg border border-border bg-slate-50 p-2">
                            <Image
                              src={featuredImage}
                              alt="Featured"
                              width={640}
                              height={360}
                              unoptimized
                              className="mx-auto h-auto max-h-[280px] w-auto max-w-full rounded-md object-contain"
                            />
                            <button
                              type="button"
                              onClick={() => setFeaturedImage(null)}
                              className="absolute right-1 top-1 z-10 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={openImagePicker}
                            className="flex aspect-video w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-slate-50 text-slate-400 transition-colors hover:border-primary/30 hover:text-primary"
                          >
                            <ImagePlus className="mb-2 h-6 w-6" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Set Featured Image</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-surface p-4">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Publish</h3>
                      <div className="mt-3 space-y-2 text-sm text-slate-700">
                        <div className="flex items-center justify-between">
                          <span>Status</span>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">Published</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                            Penulis
                          </span>
                          <span>{selectedBlog?.created_by || 'Admin'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                            Tanggal
                          </span>
                          <span>{selectedBlog ? formatDate(selectedBlog.created_at) : 'Sekarang'}</span>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={closeModal}
                          className="inline-flex flex-1 items-center justify-center rounded-corporate border border-border px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
                          disabled={isSaving || isUploadingImage}
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="inline-flex flex-1 items-center justify-center rounded-corporate bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
                          disabled={isSaving || isUploadingImage}
                        >
                          {isSaving ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              Menyimpan...
                            </span>
                          ) : modalMode === 'create' ? (
                            'Publikasikan'
                          ) : (
                            'Simpan Update'
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-surface p-4">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Metadata</h3>
                      <dl className="mt-3 space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-slate-500">Words</dt>
                          <dd className="font-medium text-slate-900">{wordCount}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-slate-500">Characters</dt>
                          <dd className="font-medium text-slate-900">{plainTextContent.length}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-slate-500">HTML length</dt>
                          <dd className="font-medium text-slate-900">{htmlContent.length}</dd>
                        </div>
                      </dl>
                    </div>

                    {uploadError ? (
                      <p className="rounded-corporate border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">{uploadError}</p>
                    ) : null}

                    {formError ? (
                      <p className="rounded-corporate border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
                    ) : null}
                  </aside>
                </form>
              ) : (
                <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-[1fr_320px]">
                  <div className="min-h-0 overflow-y-auto p-5 sm:p-7">
                    <h3 className="mb-5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h3>
                    <article
                      className="rounded-xl border border-border bg-surface p-5 text-base leading-8 text-slate-700"
                      dangerouslySetInnerHTML={{ __html: htmlContent || '<p>Konten kosong.</p>' }}
                    />
                  </div>
                  <aside className="space-y-4 border-t border-border bg-background/60 p-4 pb-6 sm:p-5 lg:border-l lg:border-t-0">
                    <div className="rounded-xl border border-border bg-surface p-4">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Informasi</h3>
                      <div className="mt-3 space-y-2 text-sm text-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                            Penulis
                          </span>
                          <span>{selectedBlog?.created_by || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                            Tanggal
                          </span>
                          <span>{selectedBlog ? formatDate(selectedBlog.created_at) : '-'}</span>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={closeModal}
                          className="inline-flex flex-1 items-center justify-center rounded-corporate border border-border px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
                        >
                          Tutup
                        </button>
                        <button
                          type="button"
                          onClick={() => selectedBlog && openEditModal(selectedBlog)}
                          className="inline-flex flex-1 items-center justify-center rounded-corporate bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </aside>
                </div>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
