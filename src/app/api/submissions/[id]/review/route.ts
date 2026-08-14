import { NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { sendEmail } from '@/lib/email'
import { revalidatePath } from 'next/cache'

const reviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().optional()
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'ADMIN' && profile?.role !== 'REVIEWER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: submissionId } = await params
    const body = await request.json()
    const validatedData = reviewSchema.parse(body)

    if (validatedData.status === 'REJECTED' && !validatedData.comment?.trim()) {
      return NextResponse.json({ error: 'Comment required for rejection' }, { status: 400 })
    }

    const submission = await prisma.checklistSubmission.findUnique({
      where: { id: submissionId },
      include: {
        submittedBy: true,
        assignment: {
          include: { template: true }
        }
      }
    })

    if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.$transaction(async (tx) => {
      // 1. Update submission status
      await tx.checklistSubmission.update({
        where: { id: submissionId },
        data: {
          status: validatedData.status,
          reviewedById: user.id,
          reviewedAt: new Date()
        }
      })

      // 2. Add history
      await tx.statusHistory.create({
        data: {
          submissionId,
          fromStatus: submission.status,
          toStatus: validatedData.status,
          changedById: user.id
        }
      })

      // 3. Add comment if provided
      if (validatedData.comment?.trim()) {
        await tx.comment.create({
          data: {
            submissionId,
            authorId: user.id,
            body: validatedData.comment.trim(),
            isReviewComment: true
          }
        })
      }
    })

    // Invalidate cached pages so all parties see fresh data immediately.
    revalidatePath('/admin/submissions')
    revalidatePath('/admin/dashboard')
    revalidatePath('/employee/checklists')
    revalidatePath('/employee/dashboard')

    // Respond to admin immediately, notify employee in the background —
    // after() runs this to completion on Vercel after the response is sent.
    if (submission.submittedBy?.email) {
      const subject = `Your task has been ${validatedData.status.toLowerCase()}`
      const text = `Hello ${submission.submittedBy.fullName},\n\nYour submission for task "${submission.assignment.template.title}" has been ${validatedData.status.toLowerCase()}.\n\n${validatedData.comment ? `Comment: ${validatedData.comment}` : ''}\n\nPlease log in to G-list for more details.`
      after(() =>
        sendEmail({ to: submission.submittedBy.email!, subject, text })
          .catch(e => console.error('Failed to send review notification email:', e))
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: (error as any).errors }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
