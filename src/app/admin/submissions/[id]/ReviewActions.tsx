'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle } from 'lucide-react'

export function ReviewActions({ submissionId }: { submissionId: string }) {
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleAction = async (status: 'APPROVED' | 'REJECTED') => {
    if (status === 'REJECTED' && !comment.trim()) {
      alert('A comment is required when rejecting a submission.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/submissions/${submissionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, comment })
      })

      if (!res.ok) throw new Error('Failed to review submission')
      
      router.push('/admin/dashboard')
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('Failed to process review')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm ring-1 ring-zinc-200 mt-6 space-y-4">
      <h3 className="text-lg font-medium text-zinc-900">Review Submission</h3>
      
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2">Review Comment</label>
        <textarea 
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Leave a comment (Required for rejection)..."
          className="w-full rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
          rows={3}
        />
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => handleAction('REJECTED')}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-transparent rounded-md hover:bg-red-100 disabled:opacity-50"
        >
          <XCircle className="w-5 h-5" /> Reject
        </button>
        <button
          onClick={() => handleAction('APPROVED')}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          <CheckCircle className="w-5 h-5" /> Approve
        </button>
      </div>
    </div>
  )
}
