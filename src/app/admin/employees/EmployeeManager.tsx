'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, UserPlus, Shield, User, Crown } from 'lucide-react'

/**
 * DEVELOPER NOTE: Terminology Drift
 * The role "EMPLOYEE" was renamed to "OPERATOR" in the database and the UI.
 * However, the internal codebase and components like this one (EmployeeManager)
 * still use the term "Employee". Treat "Employee" and "Operator" as synonymous.
 */

// Mirrors the server-side matrix in /api/employees: who can create/delete
// which role. MASTER_ADMIN manages ADMIN, OPERATOR, and REVIEWER accounts;
// ADMIN manages OPERATOR/REVIEWER only. Neither manages MASTER_ADMIN.
const MANAGEABLE_ROLES: Record<string, string[]> = {
  MASTER_ADMIN: ['ADMIN', 'OPERATOR', 'REVIEWER'],
  ADMIN: ['OPERATOR', 'REVIEWER'],
}

const ROLE_LABELS: Record<string, string> = {
  OPERATOR: 'Operator',
  REVIEWER: 'Reviewer',
  ADMIN: 'Admin',
  MASTER_ADMIN: 'Master Admin',
}

export function EmployeeManager({ initialProfiles, currentUserId, currentUserRole }: { initialProfiles: any[], currentUserId: string, currentUserRole: string }) {
  const manageableRoles = MANAGEABLE_ROLES[currentUserRole] ?? []
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const form = e.currentTarget
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: (form.elements.namedItem('fullName') as HTMLInputElement).value,
          email:    (form.elements.namedItem('email')    as HTMLInputElement).value,
          password: (form.elements.namedItem('password') as HTMLInputElement).value,
          role:     (form.elements.namedItem('role')     as HTMLSelectElement).value,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to create account.')
      } else {
        setSuccess('Employee created successfully!')
        form.reset()
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/employees?userId=${userId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to delete account.')
      } else {
        setSuccess('Employee deleted successfully!')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
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
              {manageableRoles.map(role => (
                <option key={role} value={role}>{ROLE_LABELS[role] ?? role}</option>
              ))}
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
                    {profile.role === 'MASTER_ADMIN'
                      ? <Crown className="w-4 h-4 text-purple-500" />
                      : profile.role === 'ADMIN'
                      ? <Shield className="w-4 h-4 text-indigo-500" />
                      : profile.role === 'REVIEWER'
                      ? <Shield className="w-4 h-4 text-amber-500" />
                      : <User className="w-4 h-4 text-zinc-400" />}
                    {profile.fullName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                    {profile.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      profile.role === 'MASTER_ADMIN'
                        ? 'bg-purple-50 text-purple-700 ring-purple-600/20'
                        : profile.role === 'ADMIN'
                        ? 'bg-indigo-50 text-indigo-700 ring-indigo-600/20'
                        : profile.role === 'REVIEWER'
                        ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
                        : 'bg-zinc-50 text-zinc-600 ring-zinc-500/10'
                    }`}>
                      {ROLE_LABELS[profile.role] ?? profile.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {profile.id === currentUserId ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200">
                        You
                      </span>
                    ) : manageableRoles.includes(profile.role) ? (
                      <button
                        onClick={() => handleDelete(profile.id, profile.fullName)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    ) : (
                      <span className="text-zinc-300">—</span>
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
