'use client'

import { useState } from 'react'
import { createEmployee, deleteEmployee } from './actions'
import { Trash2, UserPlus, Shield, User } from 'lucide-react'

export function EmployeeManager({ initialProfiles, currentUserId }: { initialProfiles: any[], currentUserId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData(e.currentTarget)
    const res = await createEmployee(formData)

    if (res.error) {
      setError(res.error)
    } else {
      setSuccess('Employee created successfully!')
      // Reset form
      ;(e.target as HTMLFormElement).reset()
    }
    setLoading(false)
  }

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    const res = await deleteEmployee(userId)

    if (res.error) {
      setError(res.error)
    } else {
      setSuccess('Employee deleted successfully!')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-8">
      {/* Create Employee Form */}
      <div className="bg-white p-6 rounded-lg shadow-sm ring-1 ring-zinc-200">
        <div className="flex items-center gap-2 mb-6">
          <UserPlus className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-semibold text-zinc-900">Create New Account</h2>
        </div>

        {error && <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 rounded-md ring-1 ring-red-500/20">{error}</div>}
        {success && <div className="mb-4 p-3 text-sm text-green-600 bg-green-50 rounded-md ring-1 ring-green-500/20">{success}</div>}

        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Full Name</label>
            <input type="text" name="fullName" required className="w-full rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Email Address</label>
            <input type="email" name="email" required className="w-full rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" placeholder="john@company.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
            <input type="password" name="password" required minLength={6} className="w-full rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" placeholder="Min. 6 characters" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Role</label>
            <select name="role" className="w-full rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border">
              <option value="EMPLOYEE">Employee</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="md:col-span-2 pt-2">
            <button type="submit" disabled={loading} className="w-full md:w-auto px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50">
              {loading ? 'Processing...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>

      {/* Employee List */}
      <div className="bg-white shadow-sm ring-1 ring-zinc-200 rounded-lg overflow-x-auto">
        <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50">
          <h2 className="text-lg font-medium text-zinc-900">Current Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Role</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-zinc-200">
              {initialProfiles.map(profile => (
                <tr key={profile.id} className="hover:bg-zinc-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 flex items-center gap-2">
                    {profile.role === 'ADMIN' ? <Shield className="w-4 h-4 text-indigo-500" /> : <User className="w-4 h-4 text-zinc-400" />}
                    {profile.fullName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                    {profile.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      profile.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-700 ring-indigo-600/20' : 'bg-zinc-50 text-zinc-600 ring-zinc-500/10'
                    }`}>
                      {profile.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {profile.id === currentUserId ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200">
                        You
                      </span>
                    ) : (
                      <button
                        onClick={() => handleDelete(profile.id, profile.fullName)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
