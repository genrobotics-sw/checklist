import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AdminMobileNav } from '@/components/shared/AdminMobileNav'
import { AdminSidebarLink } from '@/components/shared/AdminSidebarLink'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  // Middleware already guards /admin routes; we only call getUser() to get
  // the user id needed for the profile name + role query below.
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = user ? await supabase
    .from('profiles')
    .select('fullName, role')
    .eq('id', user.id)
    .single() : { data: null }

  const role = profile?.role ?? 'ADMIN'
  const isReviewer = role === 'REVIEWER'
  const isMasterAdmin = role === 'MASTER_ADMIN'

  const roleLabel = isReviewer ? 'Reviewer' : isMasterAdmin ? 'Master Admin' : 'Administrator'

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-zinc-100">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-950 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-5 border-b border-white/10">
          <img src="/icon-512x512.png" alt="G-list" className="h-8 w-8 rounded-lg mr-2.5" />
          <span className="font-bold text-lg text-white tracking-tight">G-list</span>
        </div>
        
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {isReviewer ? (
            /* REVIEWER: submissions only */
            <AdminSidebarLink href="/admin/submissions" icon="submissions" label="Submissions" />
          ) : (
            /* ADMIN / MASTER_ADMIN: full nav */
            <>
              <AdminSidebarLink href="/admin/dashboard" icon="home" label="Dashboard" />
              <AdminSidebarLink href="/admin/templates" icon="templates" label="Templates" />
              <AdminSidebarLink href="/admin/assignments" icon="assignments" label="Assignments" />
              <AdminSidebarLink href="/admin/employees" icon="employees" label="Employees" />
              <AdminSidebarLink href="/admin/reports" icon="reports" label="Reports" />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-white/10">
          <Link href="/admin/profile" className="flex items-center gap-3 hover:bg-white/10 p-2 rounded-xl transition-colors group">
            <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {profile?.fullName?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate group-hover:text-indigo-300 transition-colors">{profile?.fullName ?? 'Admin'}</p>
              <p className="text-xs text-zinc-500">{roleLabel}</p>
            </div>
          </Link>
          <form action="/auth/signout" method="post" className="mt-2">
            <button type="submit" className="w-full text-left text-xs text-zinc-600 hover:text-zinc-300 px-2 py-1 transition-colors">Sign out</button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <AdminMobileNav role={role} />

        <div className="p-6 md:p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}

