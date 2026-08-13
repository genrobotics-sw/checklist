import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { ReviewActions } from './ReviewActions'
import { Check, X } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default async function AdminSubmissionPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  // Auth & role are already enforced by middleware (proxy.ts).

  const submission = await prisma.checklistSubmission.findUnique({
    where: { id: params.id },
    include: {
      submittedBy: true,
      assignment: {
        include: {
          template: {
            include: {
              items: {
                orderBy: { sortOrder: 'asc' }
              }
            }
          }
        }
      },
      items: {
        include: {
          photos: true,
          videos: true
        }
      }
    }
  })

  if (!submission) notFound()

  // Create lookup for submission items
  const ansMap: Record<string, any> = {}
  submission.items.forEach(ans => {
    ansMap[ans.checklistItemId] = ans
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="bg-white p-6 rounded-lg shadow-sm ring-1 ring-zinc-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{submission.assignment.template.title}</h1>
            <p className="text-sm text-zinc-500 mt-1">Submitted by {submission.submittedBy.fullName} on {formatDate(submission.updatedAt)}</p>
            {submission.location && (
              <p className="text-sm font-medium text-zinc-700 mt-1">
                Location: <span className="font-normal text-zinc-600">{submission.location}</span>
              </p>
            )}
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
            submission.status === 'APPROVED' ? 'bg-green-50 text-green-700 ring-green-600/20' :
            submission.status === 'REJECTED' ? 'bg-red-50 text-red-700 ring-red-600/20' :
            submission.status === 'SUBMITTED' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
            'bg-zinc-50 text-zinc-600 ring-zinc-500/10'
          }`}>
            {submission.status}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {submission.assignment.template.items.map(item => {
          const ans = ansMap[item.id]
          const isChecked = ans?.isChecked || false
          const note = ans?.note || ''

          return (
            <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm ring-1 ring-zinc-200">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 rounded-full p-0.5 ${isChecked ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {isChecked ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <span className="font-medium text-zinc-900">{item.label}</span>
                  {note && (
                    <div className="mt-2 text-sm text-zinc-600 bg-zinc-50 p-2 rounded border border-zinc-100">
                      <strong>Note:</strong> {note}
                    </div>
                  )}
                  {ans?.photos && ans.photos.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-3">
                      {ans.photos.map((photo: any, idx: number) => (
                        <a key={`photo-${idx}`} href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/checklist-photos/${photo.storagePath}`} target="_blank" rel="noreferrer">
                          <img 
                            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/checklist-photos/${photo.storagePath}`} 
                            alt={`Evidence ${idx + 1}`} 
                            className="h-32 object-contain rounded ring-1 ring-zinc-200" 
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  {ans?.videos && ans.videos.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-3">
                      {ans.videos.map((video: any, idx: number) => (
                        <video 
                          key={`video-${idx}`} 
                          src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/checklist-videos/${video.storagePath}`} 
                          controls
                          className="h-48 object-contain rounded ring-1 ring-zinc-200 bg-black" 
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {submission.status === 'SUBMITTED' && (
        <ReviewActions submissionId={submission.id} />
      )}
    </div>
  )
}
