import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const itemSchema = z.object({
  label: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['REQUIRED', 'OPTIONAL']),
  sortOrder: z.number().int(),
  requiresPhoto: z.boolean(),
  requiresVideo: z.boolean().default(false)
})

const createTemplateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  isAuditTemplate: z.boolean().default(false),
  items: z.array(itemSchema).min(1)
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createTemplateSchema.parse(body)

    const template = await prisma.checklistTemplate.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        category: validatedData.category,
        isAuditTemplate: validatedData.isAuditTemplate,
        createdById: user.id,
        items: {
          create: validatedData.items
        }
      },
      include: {
        items: true
      }
    })

    return NextResponse.json({ data: template })
  } catch (error: any) {
    console.error('Template creation error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: (error as any).errors }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const templates = await prisma.checklistTemplate.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json({ data: templates })
}
