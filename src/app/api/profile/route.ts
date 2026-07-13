import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const updateProfileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
})

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateProfileSchema.parse(body)

    const updatedProfile = await prisma.profile.update({
      where: { id: user.id },
      data: {
        fullName: validatedData.fullName,
        phone: validatedData.phone,
        department: validatedData.department,
      }
    })

    return NextResponse.json({ data: updatedProfile })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
