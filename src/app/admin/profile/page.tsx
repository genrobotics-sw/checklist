import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserCircle, Mail, Building, Phone, LogOut } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function EmployeeProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const profile = await prisma.profile.findUnique({
    where: { id: user.id }
  })

  if (!profile) {
    return <div className="p-4 text-red-500">Profile not found.</div>
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold text-zinc-900">My Profile</h1>

      <div className="bg-white rounded-lg shadow-sm ring-1 ring-zinc-200 overflow-hidden">
        <div className="bg-indigo-600 px-6 py-8 flex flex-col items-center justify-center text-center">
          <div className="h-24 w-24 rounded-full bg-white flex items-center justify-center shadow-lg mb-4">
            <UserCircle className="h-20 w-20 text-indigo-200" />
          </div>
          <h2 className="text-xl font-bold text-white">{profile.fullName}</h2>
          <span className="inline-flex items-center rounded-full bg-indigo-500/50 px-2.5 py-0.5 mt-2 text-xs font-semibold text-indigo-50">
            {profile.role}
          </span>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4 text-sm">
            <div className="bg-zinc-50 p-2 rounded-md ring-1 ring-zinc-200">
              <Mail className="h-5 w-5 text-zinc-500" />
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider font-medium">Email Address</p>
              <p className="text-zinc-900 font-medium">{profile.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="bg-zinc-50 p-2 rounded-md ring-1 ring-zinc-200">
              <Building className="h-5 w-5 text-zinc-500" />
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider font-medium">Department</p>
              <p className="text-zinc-900 font-medium">{profile.department || 'Not Assigned'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="bg-zinc-50 p-2 rounded-md ring-1 ring-zinc-200">
              <Phone className="h-5 w-5 text-zinc-500" />
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider font-medium">Phone</p>
              <p className="text-zinc-900 font-medium">{profile.phone || 'Not Provided'}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-zinc-50 px-6 py-4 border-t border-zinc-200 space-y-3">
          <Link 
            href="/admin/profile/edit"
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 font-medium px-4 py-2 rounded-md transition-colors"
          >
            Edit Profile
          </Link>
          
          <Link 
            href="/admin/profile/password"
            className="w-full flex items-center justify-center gap-2 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 font-medium px-4 py-2 rounded-md ring-1 ring-zinc-300 transition-colors"
          >
            Change Password
          </Link>
          
          <form action="/auth/signout" method="post" className="pt-2">
            <button 
              type="submit" 
              className="w-full flex items-center justify-center gap-2 bg-white text-red-600 hover:bg-red-50 hover:text-red-700 font-medium px-4 py-2 rounded-md ring-1 ring-red-200 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out Securely
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
