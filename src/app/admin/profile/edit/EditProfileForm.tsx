'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Save } from 'lucide-react'

export function EditProfileForm({ 
  initialData 
}: { 
  initialData: { fullName: string, phone: string | null, department: string | null } 
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fullName, setFullName] = useState(initialData.fullName)
  const [phone, setPhone] = useState(initialData.phone || '')
  const [department, setDepartment] = useState(initialData.department || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          phone: phone || null,
          department: department || null
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update profile')
      }

      router.push('/admin/profile')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm ring-1 ring-zinc-200 space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700">Full Name</label>
          <input 
            required 
            type="text" 
            value={fullName} 
            onChange={e => setFullName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2" 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Department</label>
          <input 
            type="text" 
            value={department} 
            onChange={e => setDepartment(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2" 
            placeholder="e.g. Sales, Operations"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Phone Number</label>
          <input 
            type="tel" 
            value={phone} 
            onChange={e => setPhone(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2" 
            placeholder="e.g. +1 234 567 8900"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Link 
          href="/admin/profile"
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50"
        >
          Cancel
        </Link>
        <button 
          type="submit" 
          disabled={loading}
          className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </button>
      </div>
    </form>
  )
}
