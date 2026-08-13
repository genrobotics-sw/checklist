'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ClipboardList, Users, FileBarChart, UsersRound, ClipboardCheck } from 'lucide-react'

type IconName = 'home' | 'templates' | 'assignments' | 'employees' | 'reports' | 'submissions'

const icons: Record<IconName, React.ComponentType<any>> = {
  home: Home,
  templates: ClipboardList,
  assignments: Users,
  employees: UsersRound,
  reports: FileBarChart,
  submissions: ClipboardCheck,
}

export function AdminSidebarLink({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')
  const Icon = icons[icon]

  return (
    <Link
      href={href}
      className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
        isActive
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'text-zinc-400 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon className={`mr-3 h-4 w-4 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
      {label}
    </Link>
  )
}
