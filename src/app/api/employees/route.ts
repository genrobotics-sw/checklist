import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

const getSupabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

// POST /api/employees — create a new user account
/**
 * DEVELOPER NOTE: Terminology Drift
 * The role "EMPLOYEE" was renamed to "OPERATOR" in the database and the UI.
 * However, the internal codebase and API routes (like /api/employees) 
 * still use the term "Employee". Treat "Employee" and "Operator" as synonymous.
 */

export async function POST(request: Request) {
  try {
    // Auth guard — only ADMIN can create users
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfile?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, fullName, role } = body

    if (!email || !password || !fullName || !role) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }

    if (!['OPERATOR', 'REVIEWER', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role selected.' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (authData.user) {
      // Wait for the DB trigger (handle_new_user) to finish creating the profile
      await new Promise(resolve => setTimeout(resolve, 500))

      await prisma.profile.update({
        where: { id: authData.user.id },
        data: { role: role as 'ADMIN' | 'OPERATOR' | 'REVIEWER', fullName },
      })
    }

    revalidatePath('/admin/employees')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[POST /api/employees]', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create employee.' },
      { status: 500 }
    )
  }
}

// DELETE /api/employees?userId=... — deactivate a user
export async function DELETE(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user: callerUser } } = await supabase.auth.getUser()
    if (!callerUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    if (callerUser.id === userId) {
      return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    await prisma.profile.update({
      where: { id: userId },
      data: { isActive: false },
    })

    await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: '876000h' })
    await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => null)

    revalidatePath('/admin/employees')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DELETE /api/employees]', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to delete employee.' },
      { status: 500 }
    )
  }
}
