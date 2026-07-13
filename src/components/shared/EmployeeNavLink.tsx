'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ListTodo, User } from 'lucide-react'

const links = [
  { href: '/employee/dashboard', icon: Home, label: 'Home' },
  { href: '/employee/checklists', icon: ListTodo, label: 'My Tasks' },
  { href: '/employee/profile', icon: User, label: 'Profile' },
]

type IconName = 'home' | 'tasks' | 'user'

export function EmployeeNavLink({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  const Icon = icon === 'home' ? Home : icon === 'tasks' ? ListTodo : User

  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center flex-1 h-full gap-1 text-xs font-medium transition-colors ${
        isActive ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      <Icon className={`h-5 w-5 ${isActive ? 'text-indigo-400' : ''}`} />
      <span>{label}</span>
    </Link>
  )
}
