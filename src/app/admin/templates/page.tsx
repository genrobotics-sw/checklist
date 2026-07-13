import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Edit } from 'lucide-react'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function TemplatesPage() {
  const templates = await prisma.checklistTemplate.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { items: true, assignments: true }
      }
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Checklist Templates</h1>
        <Link 
          href="/admin/templates/new"
          className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Link>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-zinc-200 rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Items</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Assignments</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-zinc-200">
            {templates.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-zinc-500 text-sm">
                  No templates found. Create your first template to get started.
                </td>
              </tr>
            ) : (
              templates.map((template) => (
                <tr key={template.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900">
                    {template.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                    {template.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                    {template._count.items}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                    {template._count.assignments}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${template.isActive ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-zinc-50 text-zinc-600 ring-zinc-500/10'}`}>
                      {template.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/admin/templates/${template.id}/edit`} className="text-indigo-600 hover:text-indigo-900">
                      <Edit className="h-4 w-4 inline-block" />
                    </Link>
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
