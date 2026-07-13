import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, XCircle, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function EmployeeHistoryPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams
  const statusFilter = typeof searchParams.status === 'string' ? searchParams.status : null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const assignments = await prisma.checklistAssignment.findMany({
    where: { assignedToId: user.id },
    include: { template: true, submission: true },
    orderBy: { createdAt: 'desc' }
  })

  let filtered = assignments
  let title = 'All Assignments'
  let accent = 'text-zinc-600'

  if (statusFilter === 'DRAFT') {
    filtered = assignments.filter(a => a.submission?.status === 'DRAFT')
    title = 'Drafts'
    accent = 'text-blue-600'
  } else if (statusFilter === 'APPROVED') {
    filtered = assignments.filter(a => a.submission?.status === 'APPROVED')
    title = 'Approved'
    accent = 'text-emerald-600'
  } else if (statusFilter === 'REJECTED') {
    filtered = assignments.filter(a => a.submission?.status === 'REJECTED')
    title = 'Rejected'
    accent = 'text-rose-600'
  }

  const statusStyle: Record<string, string> = {
    APPROVED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    REJECTED: 'bg-rose-50 text-rose-700 border border-rose-200',
    SUBMITTED: 'bg-blue-50 text-blue-700 border border-blue-200',
    DRAFT: 'bg-zinc-100 text-zinc-600 border border-zinc-200',
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/employee/dashboard" className="p-2 -ml-1 rounded-full hover:bg-zinc-200 text-zinc-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className={`text-2xl font-bold ${accent}`}>{title}</h1>
        <span className="ml-auto text-sm text-zinc-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-2xl border border-zinc-200">
          <div className="bg-zinc-50 p-4 rounded-full mb-4">
            <FileText className="w-8 h-8 text-zinc-300" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-800">Nothing here yet</h3>
          <p className="text-sm text-zinc-400 mt-1">No {title.toLowerCase()} checklists found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => (
            <Link
              key={a.id}
              href={`/employee/checklists/${a.submission?.id || 'new'}`}
              className="flex items-center justify-between p-4 rounded-2xl bg-white border border-zinc-200 hover:border-indigo-300 hover:shadow-sm active:scale-[0.99] transition-all"
            >
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-zinc-900 truncate">{a.template.title}</h3>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    statusStyle[a.submission?.status ?? ''] ?? 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                  }`}>
                    {a.submission?.status ?? 'NOT STARTED'}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {a.dueDate ? `Due ${formatDate(a.dueDate)}` : 'No due date'}
                  </span>
                </div>
              </div>
              <div className="shrink-0 ml-3 bg-zinc-50 rounded-full p-1.5">
                <ArrowRight className="h-4 w-4 text-zinc-400" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
