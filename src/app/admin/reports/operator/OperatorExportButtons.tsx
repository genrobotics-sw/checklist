'use client'

import { useState } from 'react'
import { Download, AlertCircle } from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate } from '@/lib/utils'

const statusLabel = (s: string) =>
  ({ APPROVED: 'Approved', REJECTED: 'Rejected', SUBMITTED: 'Pending Review', DRAFT: 'Draft' }[s] ?? s)

export function OperatorExportButtons({
  submissions,
  operatorName,
}: {
  submissions: any[]
  operatorName: string
}) {
  const [notice, setNotice] = useState<string | null>(null)

  const showNotice = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(null), 3500)
  }

  const slug = operatorName.toLowerCase().replace(/\s+/g, '_')
  const dateStr = new Date().toISOString().split('T')[0]

  const handleExportCSV = () => {
    if (submissions.length === 0) {
      showNotice('No data to export.')
      return
    }

    const maxPhotos = Math.max(
      ...submissions.map(s => {
        let count = 0
        if (s.items) {
          s.items.forEach((item: any) => {
            if (item.photos) count += item.photos.length
          })
        }
        return count
      }),
      0
    )

    const baseHeaders = ['Template', 'Due Date', 'Submitted On', 'Reviewer', 'Status']
    const photoHeaders = Array.from({ length: maxPhotos }, (_, i) => `Photo ${i + 1}`)
    const headers = [...baseHeaders, ...photoHeaders]

    const rows = submissions.map(s => {
      const row = [
        s.assignment?.template?.title ?? 'Unknown',
        s.assignment?.dueDate ? formatDate(s.assignment.dueDate) : '—',
        s.submittedAt ? formatDate(s.submittedAt) : '—',
        s.reviewedBy?.fullName ?? '—',
        statusLabel(s.status),
      ]

      const photoUrls: string[] = []
      if (s.items) {
        s.items.forEach((item: any) => {
          if (item.photos) {
            item.photos.forEach((photo: any) => {
              photoUrls.push(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/checklist-photos/${photo.storagePath}`)
            })
          }
        })
      }

      while (photoUrls.length < maxPhotos) photoUrls.push('')

      return [...row, ...photoUrls]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `g-list_${slug}_${dateStr}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportPDF = () => {
    if (submissions.length === 0) {
      showNotice('No data to export.')
      return
    }

    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(18)
    doc.text(`Operator Report — ${operatorName}`, 14, 20)
    doc.setFontSize(10)
    doc.setTextColor(120)
    doc.text(
      `Generated: ${formatDate(new Date())}  ·  ${submissions.length} record${submissions.length !== 1 ? 's' : ''}`,
      14,
      27
    )

    const approved = submissions.filter(s => s.status === 'APPROVED').length
    const rejected = submissions.filter(s => s.status === 'REJECTED').length
    const pending  = submissions.filter(s => s.status === 'SUBMITTED').length
    const drafts   = submissions.filter(s => s.status === 'DRAFT').length

    doc.setTextColor(0)
    doc.setFontSize(9)
    doc.text(`Approved: ${approved}   Rejected: ${rejected}   Pending: ${pending}   Drafts: ${drafts}`, 14, 34)

    autoTable(doc, {
      startY: 40,
      head: [['Template', 'Due Date', 'Submitted On', 'Reviewer', 'Status', 'Media']],
      body: submissions.map(s => {
        let mediaCount = 0
        if (s.items) {
          s.items.forEach((item: any) => {
            if (item.photos) mediaCount += item.photos.length
            if (item.videos) mediaCount += item.videos.length
          })
        }
        
        return [
          s.assignment?.template?.title ?? 'Unknown',
          s.assignment?.dueDate ? formatDate(s.assignment.dueDate) : '—',
          s.submittedAt ? formatDate(s.submittedAt) : '—',
          s.reviewedBy?.fullName ?? '—',
          statusLabel(s.status),
          mediaCount > 0 ? 'Link' : '—'
        ]
      }),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 248, 250] },
      willDrawCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 5) {
          const submission = submissions[data.row.index]
          let mediaCount = 0
          if (submission.items) {
            submission.items.forEach((item: any) => {
              if (item.photos) mediaCount += item.photos.length
              if (item.videos) mediaCount += item.videos.length
            })
          }
          if (mediaCount > 0) {
            doc.setTextColor(37, 99, 235) // blue-600
          }
        }
      },
      didDrawCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 5) {
          const submission = submissions[data.row.index]
          let mediaCount = 0
          if (submission.items) {
            submission.items.forEach((item: any) => {
              if (item.photos) mediaCount += item.photos.length
              if (item.videos) mediaCount += item.videos.length
            })
          }
          if (mediaCount > 0) {
            const url = `${window.location.origin}/admin/submissions/${submission.id}`
            doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url })
          }
        }
      },
    })

    doc.save(`g-list_${slug}_${dateStr}.pdf`)
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {notice && (
        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-md">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {notice}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 transition-colors"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 transition-colors"
        >
          <Download className="w-4 h-4" /> Export PDF
        </button>
      </div>
    </div>
  )
}
