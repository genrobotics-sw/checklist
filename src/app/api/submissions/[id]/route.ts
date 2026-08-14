import { NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { revalidatePath } from 'next/cache'

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const params = await props.params
    const submissionId = params.id
    
    const body = await request.json()
    const { items, location, submitForReview } = body

    // Verify ownership
    const submission = await prisma.checklistSubmission.findUnique({
      where: { id: submissionId }
    })

    if (!submission || submission.submittedById !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (submission.status === 'SUBMITTED' || submission.status === 'APPROVED') {
      return NextResponse.json({ error: 'Cannot edit submitted checklist' }, { status: 400 })
    }

    // Track files that should be deleted physically from storage
    const filesToDelete: string[] = []

    // Process items in a transaction
    await prisma.$transaction(async (tx) => {
      // Update basic submission details (like location)
      await tx.checklistSubmission.update({
        where: { id: submissionId },
        data: { location }
      })
      for (const item of items) {
        // Upsert the item
        const subItem = await tx.submissionItem.upsert({
          where: {
            submissionId_checklistItemId: {
              submissionId,
              checklistItemId: item.itemId
            }
          },
          update: {
            isChecked: item.isChecked,
            note: item.note
          },
          create: {
            submissionId,
            checklistItemId: item.itemId,
            isChecked: item.isChecked,
            note: item.note
          }
        })

        // Handle photos if any
        if (item.photos && Array.isArray(item.photos)) {
          // Fetch existing photos to find ones that have been removed
          const existingPhotos = await tx.photo.findMany({
            where: { submissionItemId: subItem.id }
          })
          
          const newPaths = new Set(item.photos.map((p: any) => p.path))
          const removedPhotos = existingPhotos.filter(p => !newPaths.has(p.storagePath))
          
          // Add removed paths to our cleanup list
          filesToDelete.push(...removedPhotos.map(p => p.storagePath))

          // Sync photos: remove existing and create new ones
          await tx.photo.deleteMany({
            where: { submissionItemId: subItem.id }
          })
          
          if (item.photos.length > 0) {
            await tx.photo.createMany({
              data: item.photos.map((p: any) => ({
                submissionId,
                submissionItemId: subItem.id,
                storagePath: p.path,
                fileName: p.name || 'photo.jpg'
              }))
            })
          }
        }

        // Handle videos if any
        if (item.videos && Array.isArray(item.videos)) {
          const existingVideos = await tx.video.findMany({
            where: { submissionItemId: subItem.id }
          })
          
          const newPaths = new Set(item.videos.map((v: any) => v.path))
          const removedVideos = existingVideos.filter(v => !newPaths.has(v.storagePath))
          
          // Use a different array for video deletion if buckets are different
          // Actually, we can just delete from checklist-videos bucket
          if (removedVideos.length > 0) {
            const { error } = await supabase.storage
              .from('checklist-videos')
              .remove(removedVideos.map(v => v.storagePath))
            if (error) console.error("Failed to delete orphaned videos:", error)
          }

          await tx.video.deleteMany({
            where: { submissionItemId: subItem.id }
          })
          
          if (item.videos.length > 0) {
            await tx.video.createMany({
              data: item.videos.map((v: any) => ({
                submissionId,
                submissionItemId: subItem.id,
                storagePath: v.path,
                fileName: v.name || 'video.mp4'
              }))
            })
          }
        }
      }

      // Update submission status
      if (submitForReview) {
        await tx.checklistSubmission.update({
          where: { id: submissionId },
          data: { 
            status: 'SUBMITTED',
            submittedAt: new Date()
          }
        })

        // Add history
        await tx.statusHistory.create({
          data: {
            submissionId,
            fromStatus: submission.status,
            toStatus: 'SUBMITTED',
            changedById: user.id
          }
        })
      }
    }, {
      maxWait: 10000, // default is 2000
      timeout: 30000  // default is 5000 (5 seconds)
    })

    // Invalidate cached pages so fresh data is shown on next visit.
    revalidatePath('/employee/checklists')
    revalidatePath('/employee/dashboard')
    if (submitForReview) {
      revalidatePath('/admin/submissions')
      revalidatePath('/admin/dashboard')
    }

    // Cleanup: Physically delete abandoned files from Supabase Storage
    if (filesToDelete.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('checklist-photos')
        .remove(filesToDelete)
        
      if (storageError) {
        console.error("Failed to delete orphaned photos from storage:", storageError)
      }
    }

    if (submitForReview) {
      // Don't block the response waiting for email — after() runs this to
      // completion on Vercel after the response has already been sent.
      after(() =>
        prisma.profile.findMany({
          where: { role: { in: ['ADMIN', 'REVIEWER'] }, isActive: true },
          select: { email: true }
        }).then(admins =>
          Promise.all(
            admins
              .filter(admin => admin.email)
              .map(admin => sendEmail({
                to: admin.email!,
                subject: 'New Task Submission for Review',
                text: 'A new task has been submitted for review. Please log in to G-list to review it.'
              }).catch(e => console.error('Failed to send admin email:', e)))
          )
        ).catch(e => console.error('Failed to fetch admins for email:', e))
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Save submission error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
