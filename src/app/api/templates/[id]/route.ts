import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const itemSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  description: z.string().optional().nullable(),
  type: z.enum(['REQUIRED', 'OPTIONAL']),
  sortOrder: z.number().int(),
  requiresPhoto: z.boolean()
})

const updateTemplateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.string().min(1),
  items: z.array(itemSchema).min(1)
})

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const template = await prisma.checklistTemplate.findUnique({
      where: { id: params.id },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        }
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ data: template })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
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
    const validatedData = updateTemplateSchema.parse(body)

    // Check if template exists
    const existingTemplate = await prisma.checklistTemplate.findUnique({
      where: { id: params.id }
    })

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Update template logic
    const updatedTemplate = await prisma.$transaction(async (tx) => {
      // 1. Find existing items to determine what is being deleted
      const existingItems = await tx.checklistItem.findMany({
        where: { templateId: params.id }
      })
      const existingItemIds = existingItems.map(i => i.id)
      const incomingItemIds = validatedData.items.map(i => i.id).filter(Boolean) as string[]
      
      const itemsToDelete = existingItemIds.filter(id => !incomingItemIds.includes(id))

      // 2. Soft-delete the removed items
      if (itemsToDelete.length > 0) {
        await tx.checklistItem.updateMany({
          where: { id: { in: itemsToDelete } },
          data: { isActive: false }
        })
      }

      // 3. Upsert incoming items
      for (const item of validatedData.items) {
        if (item.id && existingItemIds.includes(item.id)) {
          await tx.checklistItem.update({
            where: { id: item.id },
            data: {
              label: item.label,
              type: item.type,
              requiresPhoto: item.requiresPhoto,
              sortOrder: item.sortOrder
            }
          })
        } else {
          await tx.checklistItem.create({
            data: {
              templateId: params.id,
              label: item.label,
              type: item.type,
              requiresPhoto: item.requiresPhoto,
              sortOrder: item.sortOrder
            }
          })
        }
      }

      // 4. Update the template metadata
      return await tx.checklistTemplate.update({
        where: { id: params.id },
        data: {
          title: validatedData.title,
          description: validatedData.description,
          category: validatedData.category,
        },
        include: {
          items: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' }
          }
        }
      })
    })

    return NextResponse.json({ data: updatedTemplate })
  } catch (error: any) {
    console.error('Template update error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: (error as any).errors }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
