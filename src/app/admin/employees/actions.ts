'use server'

import { createClient } from '@supabase/supabase-js'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

const getSupabaseAdmin = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function createEmployee(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const role = formData.get('role') as string

  if (!email || !password || !fullName || !role) {
    return { error: 'All fields are required.' }
  }

  const supabaseAdmin = getSupabaseAdmin()

  try {
    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })

    if (authError) {
      return { error: authError.message }
    }

    // 2. The profile is automatically created by the handle_new_user trigger in the DB.
    // However, the trigger sets the role to 'EMPLOYEE' by default. We should update the role
    // if the admin selected 'ADMIN'. Also, update fullName just in case the metadata didn't sync fast enough.
    
    if (authData.user) {
      // Wait briefly for the DB trigger (handle_new_user) to finish creating the profile
      // before we try to update it — avoids a race condition where the update finds nothing
      await new Promise(resolve => setTimeout(resolve, 500))

      await prisma.profile.update({
        where: { id: authData.user.id },
        data: { role: role as 'ADMIN' | 'EMPLOYEE', fullName }
      })
    }

    revalidatePath('/admin/employees')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Failed to create employee.' }
  }
}

export async function deleteEmployee(userId: string) {
  if (!userId) return { error: 'User ID is required.' }

  // Server-side guard: verify the caller is not deleting themselves
  const { createClient: createServerClient } = await import('@/lib/supabase/server')
  const supabase = await createServerClient()
  const { data: { user: callerUser } } = await supabase.auth.getUser()

  if (!callerUser) return { error: 'Unauthorized.' }
  if (callerUser.id === userId) return { error: 'You cannot delete your own account.' }

  const supabaseAdmin = getSupabaseAdmin()

  try {
    // 1. Soft delete the profile to preserve their history in assignments/reports
    await prisma.profile.update({ 
      where: { id: userId },
      data: { isActive: false }
    })
    
    // 2. Ban the user in Supabase Auth so their account is permanently disabled
    await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: '876000h' })
    
    // 3. Attempt physical deletion (silently fails if foreign key prevents it)
    await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => null)

    revalidatePath('/admin/employees')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Failed to delete employee.' }
  }
}
