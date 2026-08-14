'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams()
  const infoMessage = searchParams.get('message')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profile?.role === 'ADMIN' || profile?.role === 'MASTER_ADMIN') {
        router.push('/admin/dashboard')
      } else if (profile?.role === 'REVIEWER') {
        router.push('/admin/submissions')
      } else {
        router.push('/employee/dashboard')
      }
      router.refresh()
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-950 px-4 py-12">
      {/* Radial gradient background glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[500px] w-[500px] rounded-full bg-indigo-600/20 blur-[120px]" />
      </div>

      {/* Subtle dot grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative z-10 w-full max-w-sm space-y-8">
        {/* Logo + Title */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 shadow-2xl shadow-indigo-500/30">
            <img src="/icon-512x512.png" alt="G-list" className="h-10 w-10 rounded-lg object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Welcome back</h1>
          <p className="mt-1.5 text-sm text-zinc-400">Sign in to your G-list account</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white/5 backdrop-blur-md ring-1 ring-white/10 shadow-2xl p-6 space-y-5">
          {/* Info message */}
          {infoMessage && (
            <div className="flex items-start gap-2.5 rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4" suppressHydrationWarning>
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-300" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="block w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-zinc-500 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                suppressHydrationWarning
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-zinc-300" htmlFor="password">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 pr-11 text-sm text-white placeholder-zinc-500 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  suppressHydrationWarning
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-zinc-500 hover:text-zinc-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="relative mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-600">
          G-list © {new Date().getFullYear()} — Digital Checklist System
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
