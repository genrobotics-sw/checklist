'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    const { error: resetError } = await supabase.auth.updateUser({
      password: password,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setMessage('Your password has been successfully updated!')
      setLoading(false)
      
      // Auto redirect to login after 3 seconds
      setTimeout(async () => {
        await supabase.auth.signOut()
        router.push('/login?message=Password reset successful. Please login with your new password.')
      }, 3000)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">Set New Password</h1>
          <p className="mt-2 text-sm text-zinc-500">Please enter your new password below</p>
        </div>

        <div className="bg-white px-8 py-10 shadow-xl rounded-2xl border border-zinc-100 space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 ring-1 ring-inset ring-red-500/10">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700 ring-1 ring-inset ring-green-600/10 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{message}</p>
                <p className="mt-1 text-xs text-green-600/80">Redirecting you to the login page...</p>
              </div>
            </div>
          )}

          {!success ? (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 flex items-center gap-1.5" htmlFor="password">
                  <Lock className="h-4 w-4 text-zinc-400" /> New Password
                </label>
                <div className="relative rounded-md shadow-sm">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-lg border-zinc-200 py-2.5 pl-3 pr-10 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 flex items-center gap-1.5" htmlFor="confirmPassword">
                  <Lock className="h-4 w-4 text-zinc-400" /> Confirm New Password
                </label>
                <div className="relative rounded-md shadow-sm">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full rounded-lg border-zinc-200 py-2.5 pl-3 pr-10 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.98]"
              >
                {loading ? 'Updating Password...' : 'Reset Password'}
              </button>
            </form>
          ) : (
            <div className="text-center pt-2">
              <Link href="/login" className="inline-flex items-center justify-center rounded-lg bg-zinc-100 hover:bg-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors">
                Go to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
