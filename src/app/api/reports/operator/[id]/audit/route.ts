import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('templateId')
    const month = parseInt(searchParams.get('month') || '0', 10)
    const year = parseInt(searchParams.get('year') || '0', 10)

    if (!templateId || !month || !year) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // Build date range for the month
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)

    // Fetch submissions for this operator, template, and month
    // We only care about submissions that are submitted or approved (not draft)
    const submissions = await prisma.checklistSubmission.findMany({
      where: {
        submittedById: params.id,
        assignment: {
          templateId: templateId
        },
        status: { in: ['SUBMITTED', 'APPROVED', 'REJECTED'] },
        submittedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        items: true
      },
      orderBy: {
        submittedAt: 'asc'
      }
    })

    return NextResponse.json({ data: submissions })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
