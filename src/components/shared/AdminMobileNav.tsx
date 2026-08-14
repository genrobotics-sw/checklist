'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, Home, ClipboardList, Users, FileBarChart, UsersRound, UserCircle, ClipboardCheck } from 'lucide-react'
import { usePathname } from 'next/navigation'

const ALL_LINKS = [
  { href: '/admin/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/admin/templates', icon: ClipboardList, label: 'Templates' },
  { href: '/admin/assignments', icon: Users, label: 'Assignments' },
  { href: '/admin/employees', icon: UsersRound, label: 'Employees' },
  { href: '/admin/reports', icon: FileBarChart, label: 'Reports' },
  { href: '/admin/profile', icon: UserCircle, label: 'Profile' },
]

const REVIEWER_LINKS = [
  { href: '/admin/submissions', icon: ClipboardCheck, label: 'Submissions' },
  { href: '/admin/profile', icon: UserCircle, label: 'Profile' },
]

export function AdminMobileNav({ role }: { role?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const closeMenu = () => setIsOpen(false)

  // ADMIN and MASTER_ADMIN both get the full nav — MASTER_ADMIN has
  // everything ADMIN has, plus the ability to manage ADMIN accounts.
  const links = role === 'REVIEWER' ? REVIEWER_LINKS : ALL_LINKS

  return (
    <div className="md:hidden">
      <header className="h-14 bg-zinc-950 flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 -ml-1 text-zinc-400 hover:text-white focus:outline-none"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <img src="/icon-512x512.png" alt="G-list" className="h-6 w-6 rounded-md" />
          <span className="font-bold text-white tracking-tight">G-list</span>
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" className="text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors">Sign out</button>
        </form>
      </header>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            onClick={closeMenu}
          />
          <div className="fixed top-14 left-0 right-0 bg-zinc-900 border-b border-white/10 shadow-2xl z-50 p-3 space-y-1">
            {links.map(link => {
              const Icon = link.icon
              const isActive = pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className={`flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-zinc-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className={`mr-3 h-4 w-4 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                  {link.label}
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

