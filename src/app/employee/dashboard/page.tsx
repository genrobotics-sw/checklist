import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import { ArrowRight, Inbox, ClipboardList, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'

// Data is cached by Next.js and revalidated by revalidatePath after mutations.

export default async function EmployeeDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const profile = await prisma.profile.findUnique({ where: { id: user!.id } })

  const assignments = await prisma.checklistAssignment.findMany({
    where: { assignedToId: user!.id },
    include: { template: true, submission: true },
    orderBy: { createdAt: 'desc' }
  })

  const pendingAssignments = assignments.filter(a => !a.submission || a.submission.status === 'DRAFT' || a.submission.status === 'REJECTED')
  const totalAssigned = assignments.length
  const draftsCount = assignments.filter(a => a.submission?.status === 'DRAFT').length
  const approvedCount = assignments.filter(a => a.submission?.status === 'APPROVED').length
  const rejectedCount = assignments.filter(a => a.submission?.status === 'REJECTED').length

  const firstName = profile?.fullName?.split(' ')[0] ?? 'there'

  const stats = [
    { label: 'Total', value: totalAssigned, href: '/employee/history', color: 'from-indigo-500 to-indigo-600', icon: ClipboardList },
    { label: 'Drafts', value: draftsCount, href: '/employee/history?status=DRAFT', color: 'from-blue-500 to-blue-600', icon: Clock },
    { label: 'Approved', value: approvedCount, href: '/employee/history?status=APPROVED', color: 'from-emerald-500 to-emerald-600', icon: CheckCircle2 },
    { label: 'Rejected', value: rejectedCount, href: '/employee/history?status=REJECTED', color: 'from-rose-500 to-rose-600', icon: XCircle },
  ]

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Good day, {firstName} 👋</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Here's your checklist overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.color} p-4 text-white shadow-sm active:scale-95 transition-transform`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-white/70 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className="bg-white/20 rounded-xl p-2">
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* To Do Section */}
      <div>
        <h2 className="text-base font-semibold text-zinc-900 mb-3 flex items-center gap-2">
          <span className="inline-block w-1.5 h-4 bg-indigo-500 rounded-full" />
          Needs Action
        </h2>

        {pendingAssignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-4 text-center bg-white rounded-2xl border border-zinc-200">
            <div className="bg-indigo-50 p-4 rounded-full mb-4">
              <Inbox className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-800">All caught up!</h3>
            <p className="text-sm text-zinc-400 mt-1 max-w-xs">No pending assignments right now. Great job!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingAssignments.map(a => (
              <Link
                key={a.id}
                href={`/employee/checklists/${a.submission?.id || 'new'}`}
                className="flex items-center justify-between p-4 rounded-2xl bg-white border border-zinc-200 hover:border-indigo-300 hover:shadow-sm active:scale-[0.99] transition-all"
              >
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-900 truncate">{a.template.title}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {a.dueDate ? `Due ${formatDate(a.dueDate)}` : 'No due date'}
                  </p>
                </div>
                <div className="shrink-0 ml-3 bg-indigo-50 rounded-full p-1.5">
                  <ArrowRight className="h-4 w-4 text-indigo-500" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
