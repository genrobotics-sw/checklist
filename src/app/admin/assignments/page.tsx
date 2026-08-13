import prisma from '@/lib/prisma'
import { AssignmentForm } from './AssignmentForm'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AssignmentsPage() {
  const [templates, employees, assignments] = await Promise.all([
    prisma.checklistTemplate.findMany({ where: { isActive: true }, orderBy: { title: 'asc' } }),
    prisma.profile.findMany({ where: { role: 'OPERATOR', isActive: true }, orderBy: { fullName: 'asc' } }),
    prisma.checklistAssignment.findMany({ 
      orderBy: { createdAt: 'desc' },
      include: {
        template: true,
        assignedTo: true,
        submission: true
      }
    })
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Assignments</h1>
      
      <AssignmentForm templates={templates} employees={employees} />

      <div className="bg-white shadow-sm ring-1 ring-zinc-200 rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Template</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Assigned To</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Assigned On</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-zinc-200">
            {assignments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-zinc-500 text-sm">
                  No assignments yet.
                </td>
              </tr>
            ) : (
              assignments.map((a) => (
                <tr key={a.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900">
                    {a.template.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                    {a.assignedTo.fullName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                    {formatDate(a.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                    {a.dueDate ? formatDate(a.dueDate) : 'None'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                    {a.submission ? (
                      <a href={`/admin/submissions/${a.submission.id}`} className="hover:opacity-80">
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                          a.submission.status === 'APPROVED' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                          a.submission.status === 'REJECTED' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                          a.submission.status === 'SUBMITTED' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                          'bg-zinc-50 text-zinc-600 ring-zinc-500/10'
                        }`}>
                          {a.submission.status}
                        </span>
                      </a>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset bg-zinc-50 text-zinc-600 ring-zinc-500/10">
                        DRAFT
                      </span>
                    )}
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
