import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import { CheckCircle2, Clock, ArrowRight, Inbox } from 'lucide-react'
import { formatDate } from '@/lib/utils'

// Data is cached by Next.js and revalidated by revalidatePath after mutations.

export default async function EmployeeChecklistsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const assignments = await prisma.checklistAssignment.findMany({
    where: { assignedToId: user!.id },
    include: { template: true, submission: true },
    orderBy: { createdAt: 'desc' }
  })

  const pending = assignments.filter(a => !a.submission || a.submission.status === 'DRAFT' || a.submission.status === 'REJECTED')
  const completed = assignments.filter(a => a.submission?.status === 'SUBMITTED' || a.submission?.status === 'APPROVED')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">My Tasks</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{pending.length} pending · {completed.length} completed</p>
      </div>

      {/* Needs Action */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" /> Needs Action
        </h2>
        {pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-white rounded-2xl border border-zinc-200">
            <div className="bg-indigo-50 p-3 rounded-full mb-3">
              <Inbox className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-800">No tasks pending</h3>
            <p className="text-sm text-zinc-400 mt-1">You are all caught up for now!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map(a => (
              <Link
                key={a.id}
                href={`/employee/checklists/${a.submission?.id}`}
                className="flex items-center justify-between p-4 rounded-2xl bg-white border border-zinc-200 hover:border-indigo-300 hover:shadow-sm active:scale-[0.99] transition-all"
              >
                <div className="min-w-0">
                  <h3 className="font-semibold text-zinc-900 text-sm truncate">{a.template.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {a.submission?.status === 'REJECTED' && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        Changes Requested
                      </span>
                    )}
                    <span className="text-xs text-zinc-400">
                      {a.dueDate ? `Due ${formatDate(a.dueDate)}` : 'No due date'}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 ml-3 bg-indigo-50 rounded-full p-1.5">
                  <ArrowRight className="w-4 h-4 text-indigo-500" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Submitted */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5" /> Submitted
        </h2>
        {completed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-white rounded-2xl border border-zinc-200">
            <p className="text-sm text-zinc-400">Tasks you submit will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {completed.map(a => (
              <Link
                key={a.id}
                href={`/employee/checklists/${a.submission?.id}`}
                className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 border border-zinc-200 hover:shadow-sm active:scale-[0.99] transition-all"
              >
                <div className="min-w-0">
                  <h3 className="font-semibold text-zinc-600 text-sm truncate">{a.template.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${a.submission?.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                      {a.submission?.status}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {formatDate(a.submission!.updatedAt)}
                    </span>
                  </div>
                </div>
                <ArrowRight className="shrink-0 ml-3 w-4 h-4 text-zinc-400" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
