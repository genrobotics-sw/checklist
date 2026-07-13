import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { EmployeeManager } from './EmployeeManager'
import { UsersRound } from 'lucide-react'

export default async function EmployeesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'ADMIN') redirect('/employee/dashboard')

  const profiles = await prisma.profile.findMany({
    where: { isActive: true },
    orderBy: [
      { role: 'asc' },
      { fullName: 'asc' }
    ]
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 flex items-center gap-2">
          <UsersRound className="w-6 h-6 text-indigo-600" />
          Employee Management
        </h1>
      </div>

      <EmployeeManager initialProfiles={profiles} currentUserId={user.id} />
    </div>
  )
}
