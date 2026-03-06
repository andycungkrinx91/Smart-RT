'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8 glass-card rounded-3xl text-center">
      <h2 className="text-2xl font-bold text-white mb-2">Terjadi Kesalahan</h2>
      <p className="text-slate-400 mb-6 max-w-md">
        Gagal memuat data dari server. Pastikan Anda memiliki koneksi internet dan coba lagi.
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="btn-primary"
        >
          Coba Lagi
        </button>
        <Link href="/admin" className="px-6 py-2 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors">
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  )
}
