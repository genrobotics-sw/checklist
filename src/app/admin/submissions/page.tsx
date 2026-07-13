import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChecklistStatus } from '@prisma/client'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AdminSubmissionsList({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'ADMIN') redirect('/employee/dashboard')

  const { status } = await searchParams

  const whereClause: any = {}
  if (status && typeof status === 'string' && ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].includes(status.toUpperCase())) {
    whereClause.status = status.toUpperCase() as ChecklistStatus
  }

  const submissions = await prisma.checklistSubmission.findMany({
    where: whereClause,
    include: {
      submittedBy: true,
      assignment: {
        include: {
          template: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  })

  const displayStatus = typeof status === 'string'
    ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
    : ''

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {displayStatus ? `${displayStatus} Submissions` : 'All Submissions'}
        </h1>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-zinc-200 rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Template</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Submitted By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Last Updated</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-zinc-200">
            {submissions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-zinc-500 text-sm">
                  No submissions found.
                </td>
              </tr>
            ) : (
              submissions.map((s) => (
                <tr key={s.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900">
                    <Link href={`/admin/submissions/${s.id}`} className="hover:text-indigo-600">
                      {s.assignment.template.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                    {s.submittedBy.fullName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                    {formatDate(s.updatedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${s.status === 'APPROVED' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                        s.status === 'REJECTED' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                          s.status === 'SUBMITTED' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                            'bg-zinc-50 text-zinc-600 ring-zinc-500/10'
                      }`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
