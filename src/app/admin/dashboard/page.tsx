import Link from 'next/link'
import prisma from '@/lib/prisma'
import { ClipboardList, Users, CheckCircle2, Clock, HardDrive, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const [templateCount, assignmentCount, pendingCount, approvedCount] = await Promise.all([
    prisma.checklistTemplate.count({ where: { isActive: true } }),
    prisma.checklistAssignment.count(),
    prisma.checklistSubmission.count({ where: { status: 'SUBMITTED' } }),
    prisma.checklistSubmission.count({ where: { status: 'APPROVED' } }),
  ])

  let storageBytes = 0
  try {
    const result: any = await prisma.$queryRaw`SELECT SUM(COALESCE((metadata->>'size')::bigint, 0)) as total_bytes FROM storage.objects WHERE bucket_id = 'checklist-photos';`
    if (result && result[0] && result[0].total_bytes) {
      storageBytes = Number(result[0].total_bytes)
    }
  } catch (e) {
    console.error('Failed to fetch storage size', e)
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const TOTAL_CAPACITY = 1073741824
  const storagePercent = Math.min(100, Math.round((storageBytes / TOTAL_CAPACITY) * 100))

  const stats = [
    {
      label: 'Active Templates',
      value: templateCount,
      icon: ClipboardList,
      color: 'text-indigo-500',
      bg: 'bg-indigo-50',
      href: '/admin/templates',
      linkLabel: 'View templates'
    },
    {
      label: 'Total Assignments',
      value: assignmentCount,
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      href: '/admin/assignments',
      linkLabel: 'View assignments'
    },
    {
      label: 'Pending Reviews',
      value: pendingCount,
      icon: Clock,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
      href: '/admin/submissions?status=SUBMITTED',
      linkLabel: 'Review now'
    },
    {
      label: 'Approved',
      value: approvedCount,
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
      href: '/admin/submissions?status=APPROVED',
      linkLabel: 'View approved'
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Platform overview and activity</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className={`${stat.bg} p-2.5 rounded-xl`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-zinc-900">{stat.value}</p>
                <p className="text-sm text-zinc-500 mt-1">{stat.label}</p>
              </div>
              <div className="bg-zinc-50 border-t border-zinc-100 px-5 py-3">
                <Link href={stat.href} className={`text-sm font-medium ${stat.color} flex items-center gap-1 hover:gap-2 transition-all`}>
                  {stat.linkLabel}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Storage Card */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="bg-zinc-100 p-2.5 rounded-xl">
              <HardDrive className="h-5 w-5 text-zinc-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">Photo Storage</p>
              <p className="text-xs text-zinc-500">{formatBytes(storageBytes)} used of 1 GB</p>
            </div>
          </div>
          <span className="text-sm font-bold text-zinc-900">{storagePercent}%</span>
        </div>
        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${storagePercent > 80 ? 'bg-rose-500' : storagePercent > 50 ? 'bg-amber-500' : 'bg-indigo-500'}`}
            style={{ width: `${storagePercent}%` }}
          />
        </div>
        <p className="text-xs text-zinc-400 mt-2">{formatBytes(TOTAL_CAPACITY - storageBytes)} remaining</p>
      </div>
    </div>
  )
}
