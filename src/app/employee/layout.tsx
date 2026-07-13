import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { EmployeeNavLink } from '@/components/shared/EmployeeNavLink'

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex flex-col min-h-screen bg-zinc-100 pb-16 md:pb-0">
      {/* Top Header */}
      <header className="h-14 bg-zinc-950 flex items-center justify-between px-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2">
          <img src="/icon-512x512.png" alt="G-list" className="h-7 w-7 rounded-lg" />
          <span className="font-bold text-white tracking-tight">G-list</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/employee/profile" className="text-sm text-zinc-400 hover:text-white transition-colors hidden md:block">
            Profile
          </Link>
          <form action="/auth/signout" method="post" className="hidden md:block">
            <button type="submit" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 max-w-2xl mx-auto w-full">
        {children}
      </main>

      {/* Bottom Tab Bar (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-zinc-950 border-t border-white/10 flex items-center justify-around md:hidden z-30">
        <EmployeeNavLink href="/employee/dashboard" icon="home" label="Home" />
        <EmployeeNavLink href="/employee/checklists" icon="tasks" label="My Tasks" />
        <EmployeeNavLink href="/employee/profile" icon="user" label="Profile" />
      </nav>
    </div>
  )
}
