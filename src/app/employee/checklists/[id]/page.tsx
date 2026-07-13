import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { ChecklistForm } from './ChecklistForm'

export default async function ChecklistPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const submission = await prisma.checklistSubmission.findUnique({
    where: { id: params.id },
    include: {
      assignment: {
        include: {
          template: {
            include: {
              items: {
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' }
              }
            }
          }
        }
      },
      items: {
        include: {
          photos: true
        }
      },
      comments: {
        orderBy: { createdAt: 'desc' },
        include: { author: true }
      }
    }
  })

  if (!submission || submission.submittedById !== user.id) {
    notFound()
  }

  // Pre-fill initial data
  const initialData: Record<string, any> = {}
  submission.items.forEach(ans => {
    initialData[ans.checklistItemId] = {
      id: ans.id,
      itemId: ans.checklistItemId,
      isChecked: ans.isChecked,
      note: ans.note,
      photos: ans.photos.map((p: any) => ({
        url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/checklist-photos/${p.storagePath}`,
        path: p.storagePath,
        name: p.fileName
      }))
    }
  })

  const isReadOnly = submission.status === 'SUBMITTED' || submission.status === 'APPROVED'

  return (
    <ChecklistForm 
      submissionId={submission.id}
      templateTitle={submission.assignment.template.title}
      templateCategory={(submission.assignment.template as any).category ?? null}
      templateDescription={(submission.assignment.template as any).description ?? null}
      items={submission.assignment.template.items as any}
      initialData={initialData}
      isReadOnly={isReadOnly}
      comments={submission.comments}
      initialLocation={submission.location || ''}
    />
  )
}
