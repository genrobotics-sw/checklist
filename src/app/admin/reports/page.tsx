import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  FileBarChart, Filter, CheckCircle2, XCircle, Clock,
  FileText, ExternalLink, Users, ChevronRight,
} from 'lucide-react'
import { ExportButtons } from './ExportButtons'
import { formatDate } from '@/lib/utils'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { status, templateId, from, to } = await searchParams

  const whereClause: any = {}
  if (status && typeof status === 'string') whereClause.status = status.toUpperCase()
  if (templateId && typeof templateId === 'string') whereClause.assignment = { templateId }
  if (from || to) {
    whereClause.updatedAt = {}
    if (from && typeof from === 'string') whereClause.updatedAt.gte = new Date(from)
    if (to && typeof to === 'string') {
      const toDate = new Date(to as string)
      toDate.setHours(23, 59, 59, 999)
      whereClause.updatedAt.lte = toDate
    }
  }

  const [templates, operators] = await Promise.all([
    prisma.checklistTemplate.findMany({
      where: { isActive: true },
      orderBy: { title: 'asc' }
    }),
    prisma.profile.findMany({
      where: { role: 'OPERATOR', isActive: true },
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        _count: { select: { submissions: true } },
      },
    }),
  ])

  const submissions = await prisma.checklistSubmission.findMany({
    where: whereClause,
    include: {
      submittedBy: true,
      reviewedBy: true,
      assignment: { include: { template: true } },
      items: { include: { photos: true } }
    },
    orderBy: { updatedAt: 'desc' }
  })

  const approvedCount = submissions.filter(s => s.status === 'APPROVED').length
  const rejectedCount = submissions.filter(s => s.status === 'REJECTED').length
  const pendingCount  = submissions.filter(s => s.status === 'SUBMITTED').length
  const draftCount    = submissions.filter(s => s.status === 'DRAFT').length
  const isFiltered    = !!(status || templateId || from || to)

  const statusLabel = (s: string) => ({ APPROVED: 'Approved', REJECTED: 'Rejected', SUBMITTED: 'Pending Review', DRAFT: 'Draft' }[s] ?? s)
  const statusStyle = (s: string) => ({
    APPROVED:  'bg-green-50 text-green-700 ring-green-600/20',
    REJECTED:  'bg-red-50 text-red-700 ring-red-600/20',
    SUBMITTED: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  }[s] ?? 'bg-zinc-50 text-zinc-600 ring-zinc-500/10')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900 flex items-center gap-2">
          <FileBarChart className="w-6 h-6 text-indigo-600" />
          Submission Reports
        </h1>
        <ExportButtons submissions={submissions} />
      </div>

      {/* Stat Cards — 4 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg shrink-0"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
          <div>
            <p className="text-xs text-zinc-500 font-medium">Approved</p>
            <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded-lg shrink-0"><XCircle className="w-5 h-5 text-red-600" /></div>
          <div>
            <p className="text-xs text-zinc-500 font-medium">Rejected</p>
            <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg shrink-0"><Clock className="w-5 h-5 text-blue-600" /></div>
          <div>
            <p className="text-xs text-zinc-500 font-medium">Pending Review</p>
            <p className="text-2xl font-bold text-blue-600">{pendingCount}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-zinc-100 rounded-lg shrink-0"><FileText className="w-5 h-5 text-zinc-500" /></div>
          <div>
            <p className="text-xs text-zinc-500 font-medium">Drafts</p>
            <p className="text-2xl font-bold text-zinc-600">{draftCount}</p>
          </div>
        </div>
      </div>

      {/* Operator Reports */}
      <div className="bg-white shadow-sm ring-1 ring-zinc-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-semibold text-zinc-900">Operator Reports</h2>
          <span className="ml-auto text-xs text-zinc-400">{operators.length} operator{operators.length !== 1 ? 's' : ''}</span>
        </div>
        {operators.length === 0 ? (
          <p className="px-6 py-8 text-sm text-zinc-400 text-center">No active operators found.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {operators.map(op => (
              <li key={op.id}>
                <Link
                  href={`/admin/reports/operator/${op.id}`}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-zinc-50 transition-colors group"
                >
                  <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {op.fullName?.[0]?.toUpperCase() ?? 'O'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900 group-hover:text-indigo-700 transition-colors">{op.fullName}</p>
                    <p className="text-xs text-zinc-400 truncate">{op.email}</p>
                  </div>
                  <span className="text-xs text-zinc-400 shrink-0">{op._count.submissions} submission{op._count.submissions !== 1 ? 's' : ''}</span>
                  <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-indigo-500 transition-colors shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Table Container */}
      <div className="bg-white shadow-sm ring-1 ring-zinc-200 rounded-lg overflow-hidden">

        {/* Filters */}
        <div className="p-4 bg-zinc-50 border-b border-zinc-200">
          <form className="flex flex-wrap gap-3 items-end" method="get">
            <div className="flex items-center gap-2 text-sm text-zinc-600 font-medium self-center">
              <Filter className="w-4 h-4" /> Filters:
            </div>

            <select name="status" defaultValue={(status as string) || ''}
              className="rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border bg-white">
              <option value="">All Statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="SUBMITTED">Pending Review</option>
              <option value="DRAFT">Draft</option>
            </select>

            <select name="templateId" defaultValue={(templateId as string) || ''}
              className="rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border bg-white max-w-[200px]">
              <option value="">All Templates</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>

            <div className="flex items-center gap-1.5">
              <label className="text-xs text-zinc-500 font-medium whitespace-nowrap">From</label>
              <input type="date" name="from" defaultValue={(from as string) || ''}
                className="rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border bg-white" />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-zinc-500 font-medium whitespace-nowrap">To</label>
              <input type="date" name="to" defaultValue={(to as string) || ''}
                className="rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border bg-white" />
            </div>

            <button type="submit" className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-zinc-800 transition-colors">
              Apply Filters
            </button>
            {isFiltered && (
              <Link href="/admin/reports" className="px-4 py-2 bg-white text-zinc-700 border border-zinc-300 text-sm font-medium rounded-md hover:bg-zinc-50 transition-colors">
                Clear
              </Link>
            )}
          </form>
        </div>

        {/* Row count */}
        <div className="px-6 py-2 border-b border-zinc-100 bg-white">
          <p className="text-xs text-zinc-400">
            Showing <span className="font-semibold text-zinc-600">{submissions.length}</span> result{submissions.length !== 1 ? 's' : ''}{isFiltered && ' · filtered view'}
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                {['Template', 'Operator', 'Reviewer', 'Due Date', 'Submitted On', 'Status', 'Action'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-zinc-200">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <FileBarChart className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
                    <p className="text-zinc-500 text-sm font-medium">No submissions found</p>
                    <p className="text-zinc-400 text-xs mt-1">Try changing or clearing your filters.</p>
                  </td>
                </tr>
              ) : (
                submissions.map((s) => {
                  const isOverdue = s.assignment.dueDate &&
                    new Date(s.assignment.dueDate) < new Date() &&
                    s.status !== 'APPROVED' && s.status !== 'REJECTED'
                  return (
                    <tr key={s.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-zinc-900">
                        {s.assignment.template.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                        {s.submittedBy.fullName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                        {s.reviewedBy?.fullName ?? <span className="text-zinc-300">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {s.assignment.dueDate ? (
                          <span className={isOverdue ? 'text-red-600 font-medium' : 'text-zinc-500'}>
                            {formatDate(s.assignment.dueDate)}{isOverdue && ' ⚠'}
                          </span>
                        ) : <span className="text-zinc-300">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                        {s.submittedAt ? formatDate(s.submittedAt) : <span className="text-zinc-300">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyle(s.status)}`}>
                          {statusLabel(s.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/admin/submissions/${s.id}`}
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-medium transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" /> View
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
