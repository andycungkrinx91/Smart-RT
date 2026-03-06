'use client'

import { useMemo } from 'react'
import { motion, type Transition, type Variants } from 'framer-motion'
import { Users, FileText, RefreshCw, LucideIcon, Landmark, Receipt, Wallet, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import { useStatsStream } from '@/hooks/useStatsStream'
import { formatCurrency } from '@/lib/format'

// ─── Motion Variants ────────────────────────────────────────────────────────

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const donutStrokeTransition: Transition = { duration: 1, delay: 0.2, ease: 'easeOut' }
const progressTransition: Transition = { duration: 1, delay: 0.2 }

// ─── Components ─────────────────────────────────────────────────────────────

interface MetricCardProps {
  title: string
  subtitle?: string
  value: number
  icon: LucideIcon
  isCurrency?: boolean
  color?: 'blue' | 'emerald' | 'red' | 'amber'
}

function CorporateMetricCard({ title, subtitle, value, icon: Icon, isCurrency, color = 'blue' }: MetricCardProps) {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600'
  }

  return (
    <motion.div
      variants={fadeUpVariants}
      className="flex flex-col justify-center rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${colorStyles[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          {isCurrency ? formatCurrency(value) : new Intl.NumberFormat('id-ID').format(value)}
        </h3>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        )}
      </div>
    </motion.div>
  )
}

interface DonutChartProps {
  title: string
  total: number
  active: number
  inactive: number
}

function CorporateDonutChart({ title, total, active, inactive }: DonutChartProps) {
  const activePercent = total > 0 ? Math.round((active / total) * 100) : 0
  const inactivePercent = total > 0 ? 100 - activePercent : 0

  const radius = 36
  const circumference = 2 * Math.PI * radius
  const activeStroke = (activePercent / 100) * circumference

  return (
    <motion.div
      variants={fadeUpVariants}
      className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <p className="mb-6 text-xs text-slate-500">Aktif vs Tidak Aktif</p>
      
      <div className="flex items-center gap-6">
        <div className="relative h-24 w-24 shrink-0">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#e2e8f0"
              strokeWidth="12"
            />
            <motion.circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#2563eb"
              strokeWidth="12"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - activeStroke }}
              transition={donutStrokeTransition}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-slate-900">
              {new Intl.NumberFormat('id-ID').format(total)}
            </span>
            <span className="text-[10px] font-medium uppercase text-slate-500">Total</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-blue-600" />
                <span className="font-medium text-slate-600">Aktif</span>
              </div>
              <span className="font-bold text-slate-900">{activePercent}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <motion.div 
                className="h-full rounded-full bg-blue-600"
                initial={{ width: 0 }}
                animate={{ width: `${activePercent}%` }}
                transition={progressTransition}
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-slate-300" />
                <span className="font-medium text-slate-600">Tidak Aktif</span>
              </div>
              <span className="font-bold text-slate-900">{inactivePercent}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <motion.div 
                className="h-full rounded-full bg-slate-300"
                initial={{ width: 0 }}
                animate={{ width: `${inactivePercent}%` }}
                transition={progressTransition}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

function deriveActiveInactive(total: number, activeRatio = 0.8) {
  const active = Math.round(total * activeRatio)
  return { active, inactive: total - active }
}

export default function AdminHome() {
  const { stats, isLoading, errorMessage, reconnect } = useStatsStream()
  const dateInfo = useMemo(() => {
    const now = new Date()
    return {
      month: now.toLocaleDateString('id-ID', { month: 'long' }),
      year: now.getFullYear().toString(),
    }
  }, [])

  // Placeholders for active/inactive splits
  const penggunaStats = deriveActiveInactive(stats.penduduk, 0.8)
  const blogStats = deriveActiveInactive(stats.blogs, 0.85)
  const jadwalTotal = Math.max(stats.kk, 1) // Mock total for jadwal
  const jadwalStats = deriveActiveInactive(jadwalTotal, 0.75)

  return (
    <motion.div
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUpVariants} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Ringkasan data utama layanan admin Smart-RT.
          </p>
        </div>
      </motion.div>

      {errorMessage && (
        <motion.div
          variants={fadeUpVariants}
          className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={reconnect}
            className="flex items-center gap-1.5 rounded border border-red-300 bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-200"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Coba lagi
          </button>
        </motion.div>
      )}

      {/* Row 1: Metrics */}
      <motion.div
        variants={containerVariants}
        className="grid gap-6 sm:grid-cols-2"
      >
        <CorporateMetricCard
          title="Total Data Penduduk"
          subtitle="Warga terdaftar dalam sistem"
          value={stats.penduduk}
          icon={Users}
        />
        <CorporateMetricCard
          title="Total Data Kartu Keluarga"
          subtitle="Dokumen KK yang terdata"
          value={stats.kk}
          icon={FileText}
        />
      </motion.div>

      
      {/* ── DATA KEUANGAN RT ──────────────────────────────────────────────────────── */}
      <div className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
        <motion.div variants={fadeUpVariants}>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Data Keuangan RT</h2>
          <p className="text-sm text-slate-500">Ringkasan arus kas masuk dan keluar untuk operasional RT.</p>
        </motion.div>

        {/* Laporan Bulan Ini */}
        <div className="space-y-4">
          <motion.div variants={fadeUpVariants}>
            <h3 className="text-base font-semibold text-slate-800">
              Laporan Bulan Ini {dateInfo.month ? `(${dateInfo.month})` : ''}
            </h3>
          </motion.div>
          <motion.div variants={containerVariants} className="grid gap-6 sm:grid-cols-3">
            <CorporateMetricCard
              title="Pemasukan (Bulan Ini)"
              value={stats.pemasukan_bulan_ini}
              icon={TrendingUp}
              isCurrency
              color="emerald"
            />
            <CorporateMetricCard
              title="Pengeluaran (Bulan Ini)"
              value={stats.pengeluaran_bulan_ini}
              icon={TrendingDown}
              isCurrency
              color="red"
            />
            <CorporateMetricCard
              title="Saldo Akhir (Bulan Ini)"
              value={stats.pemasukan_bulan_ini - stats.pengeluaran_bulan_ini}
              icon={Wallet}
              isCurrency
              color={stats.pemasukan_bulan_ini - stats.pengeluaran_bulan_ini >= 0 ? 'emerald' : 'red'}
            />
          </motion.div>
        </div>

        {/* Laporan Tahun Ini */}
        <div className="space-y-4 pt-4">
          <motion.div variants={fadeUpVariants}>
            <h3 className="text-base font-semibold text-slate-800">
              Laporan Tahun Ini {dateInfo.year ? `(${dateInfo.year})` : ''}
            </h3>
          </motion.div>
          <motion.div variants={containerVariants} className="grid gap-6 sm:grid-cols-3">
            <CorporateMetricCard
              title="Total Pemasukan (Tahun Ini)"
              value={stats.pemasukan_tahun_ini}
              icon={TrendingUp}
              isCurrency
              color="emerald"
            />
            <CorporateMetricCard
              title="Total Pengeluaran (Tahun Ini)"
              value={stats.pengeluaran_tahun_ini}
              icon={TrendingDown}
              isCurrency
              color="red"
            />
            <CorporateMetricCard
              title="Saldo Bersih (Tahun Ini)"
              value={stats.pemasukan_tahun_ini - stats.pengeluaran_tahun_ini}
              icon={Landmark}
              isCurrency
              color={stats.pemasukan_tahun_ini - stats.pengeluaran_tahun_ini >= 0 ? 'emerald' : 'red'}
            />
          </motion.div>
        </div>
      </div>

      {/* ── DATA IURAN WARGA ──────────────────────────────────────────────────────── */}
      <div className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
        <motion.div variants={fadeUpVariants}>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Data Iuran Warga</h2>
          <p className="text-sm text-slate-500">Pantauan pembayaran iuran bulanan dan tunggakan warga.</p>
        </motion.div>

        {/* Laporan Bulan Ini */}
        <div className="space-y-4">
          <motion.div variants={fadeUpVariants}>
            <h3 className="text-base font-semibold text-slate-800">
              Laporan Bulan Ini {dateInfo.month ? `(${dateInfo.month})` : ''}
            </h3>
          </motion.div>
          <motion.div variants={containerVariants} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CorporateMetricCard
              title="Total Iuran (Bulan Ini)"
              value={stats.iuran_total_bulan_ini}
              icon={Receipt}
              isCurrency
              color="blue"
            />
            <CorporateMetricCard
              title="Total Tunggakan (Bulan Ini)"
              value={stats.tunggakan_bulan_ini}
              icon={AlertCircle}
              isCurrency
              color="red"
            />
            <CorporateMetricCard
              title="Lunas (KK) Bulan Ini"
              subtitle="Jumlah KK yang sudah membayar iuran"
              value={stats.iuran_lunas_bulan_ini}
              icon={CheckCircle2}
              color="emerald"
            />
            <CorporateMetricCard
              title="Belum Lunas (KK) Bulan Ini"
              subtitle="Jumlah KK yang belum membayar iuran"
              value={stats.iuran_belum_lunas_bulan_ini}
              icon={XCircle}
              color="red"
            />
          </motion.div>
        </div>

        {/* Laporan Tahun Ini */}
        <div className="space-y-4 pt-4">
          <motion.div variants={fadeUpVariants}>
            <h3 className="text-base font-semibold text-slate-800">
              Laporan Tahun Ini {dateInfo.year ? `(${dateInfo.year})` : ''}
            </h3>
          </motion.div>
          <motion.div variants={containerVariants} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CorporateMetricCard
              title="Total Iuran (Tahun Ini)"
              value={stats.iuran_total_tahun_ini}
              icon={Receipt}
              isCurrency
              color="blue"
            />
            <CorporateMetricCard
              title="Total Tunggakan (Tahun Ini)"
              value={stats.tunggakan_tahun_ini}
              icon={AlertCircle}
              isCurrency
              color="red"
            />
            <CorporateMetricCard
              title="Lunas (KK) Tahun Ini"
              subtitle="Jumlah KK yang sudah membayar iuran"
              value={stats.iuran_lunas_tahun_ini}
              icon={CheckCircle2}
              color="emerald"
            />
            <CorporateMetricCard
              title="Belum Lunas (KK) Tahun Ini"
              subtitle="Jumlah KK yang belum membayar iuran"
              value={stats.iuran_belum_lunas_tahun_ini}
              icon={XCircle}
              color="red"
            />
          </motion.div>
        </div>
      </div>

{/* Row 5: Donut Charts */}
      <motion.div variants={fadeUpVariants} className="pt-2">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Status Distribusi</h2>
        <p className="text-sm text-slate-500">Rasio aktif dan tidak aktif per kategori</p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
      >
        <CorporateDonutChart
          title="Total Data Pengguna"
          total={stats.penduduk}
          active={penggunaStats.active}
          inactive={penggunaStats.inactive}
        />
        <CorporateDonutChart
          title="Total Blog"
          total={stats.blogs}
          active={blogStats.active}
          inactive={blogStats.inactive}
        />
        <CorporateDonutChart
          title="Total Jadwal Kegiatan"
          total={jadwalTotal}
          active={jadwalStats.active}
          inactive={jadwalStats.inactive}
        />
      </motion.div>
    </motion.div>
  )
}
