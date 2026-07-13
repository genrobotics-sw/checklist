'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AssignmentForm({ templates, employees }: { templates: any[], employees: any[] }) {
  const [templateId, setTemplateId] = useState('')
  const [employeeIds, setEmployeeIds] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, employeeIds, dueDate: dueDate || undefined })
      })

      if (res.ok) {
        setTemplateId('')
        setEmployeeIds([])
        setDueDate('')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEmployeeToggle = (id: string) => {
    setEmployeeIds(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id])
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm ring-1 ring-zinc-200 mb-8 space-y-4">
      <h2 className="text-lg font-medium text-zinc-900 mb-4">Create New Assignment</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-zinc-700">Template</label>
          <select 
            required
            value={templateId}
            onChange={e => setTemplateId(e.target.value)}
            className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
          >
            <option value="">Select a template...</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Due Date (Optional)</label>
          <input 
            type="date" 
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2">Assign To Employees</label>
        <div className="max-h-48 overflow-y-auto border border-zinc-200 rounded-md p-2 space-y-1">
          {employees.map(e => (
            <label key={e.id} className="flex items-center gap-2 p-2 hover:bg-zinc-50 rounded">
              <input 
                type="checkbox"
                checked={employeeIds.includes(e.id)}
                onChange={() => handleEmployeeToggle(e.id)}
                className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600"
              />
              <span className="text-sm text-zinc-900">{e.fullName} ({e.email})</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button 
          type="submit" 
          disabled={loading || !templateId || employeeIds.length === 0}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Assigning...' : 'Assign Template'}
        </button>
      </div>
    </form>
  )
}
