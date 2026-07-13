import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { EditProfileForm } from './EditProfileForm'

export default async function EditProfilePage() {
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
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/employee/profile" className="p-2 -ml-2 rounded-full hover:bg-zinc-100 text-zinc-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">Edit Profile</h1>
      </div>

      <EditProfileForm initialData={{
        fullName: profile.fullName,
        phone: profile.phone,
        department: profile.department
      }} />
    </div>
  )
}
