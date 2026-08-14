import { NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { sendEmail } from '@/lib/email'
import { formatDate } from '@/lib/utils'

const createAssignmentSchema = z.object({
  templateId: z.string().uuid(),
  employeeIds: z.array(z.string().uuid()).min(1),
  dueDate: z.string().optional()
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'ADMIN' && profile?.role !== 'MASTER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const validatedData = createAssignmentSchema.parse(body)

    const dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null

    // Create assignments for all employees
    const assignments = await prisma.$transaction(
      validatedData.employeeIds.map(employeeId => 
        prisma.checklistAssignment.create({
          data: {
            templateId: validatedData.templateId,
            assignedToId: employeeId,
            assignedById: user.id,
            dueDate
          },
          include: {
            template: true,
            assignedTo: true
          }
        })
      )
    )

    // For each assignment, create an empty draft submission
    await prisma.$transaction(
      assignments.map(assignment => 
        prisma.checklistSubmission.create({
          data: {
            assignmentId: assignment.id,
            submittedById: assignment.assignedToId,
            status: 'DRAFT'
          }
        })
      )
    )

    // Respond immediately, send emails in the background — after() guarantees
    // this runs to completion on Vercel even though the response has already
    // been sent (a plain un-awaited promise gets killed when the function
    // freezes right after the response is flushed).
    after(() =>
      Promise.all(
        assignments
          .filter(a => a.assignedTo?.email)
          .map(a => sendEmail({
            to: a.assignedTo.email!,
            subject: `New Task Assigned: ${a.template.title}`,
            text: `Hello ${a.assignedTo.fullName},\n\nYou have been assigned a new task: ${a.template.title}.\nPlease log in to G-list to complete it.\n\nDue Date: ${a.dueDate ? formatDate(a.dueDate) : 'None'}`
          }))
      ).catch(e => console.error('Failed to send assignment emails:', e))
    )

    return NextResponse.json({ data: assignments })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: (error as any).errors }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
