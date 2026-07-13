'use client'

import { useState } from 'react'
import { Download, AlertCircle } from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate } from '@/lib/utils'

const statusLabel = (s: string) =>
  ({ APPROVED: 'Approved', REJECTED: 'Rejected', SUBMITTED: 'Pending Review', DRAFT: 'Draft' }[s] ?? s)

export function ExportButtons({ submissions }: { submissions: any[] }) {
  const [notice, setNotice] = useState<string | null>(null)

  const showNotice = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(null), 3500)
  }

  const handleExportCSV = () => {
    if (submissions.length === 0) {
      showNotice('No data to export — try clearing your filters.')
      return
    }

    const headers = ['Template', 'Employee', 'Reviewer', 'Location', 'Due Date', 'Last Updated', 'Status']
    const rows = submissions.map(s => [
      s.assignment?.template?.title ?? 'Unknown',
      s.submittedBy?.fullName ?? 'Unknown',
      s.reviewedBy?.fullName ?? '-',
      s.location ?? 'Not Specified',
      s.assignment?.dueDate ? formatDate(s.assignment.dueDate) : '—',
      formatDate(s.updatedAt),
      statusLabel(s.status),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `g-list_report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportPDF = () => {
    if (submissions.length === 0) {
      showNotice('No data to export — try clearing your filters.')
      return
    }

    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(18)
    doc.text('G-list Submission Report', 14, 20)
    doc.setFontSize(10)
    doc.setTextColor(120)
    doc.text(`Generated: ${formatDate(new Date())}  ·  ${submissions.length} record${submissions.length !== 1 ? 's' : ''}`, 14, 27)

    autoTable(doc, {
      startY: 33,
      head: [['Template', 'Employee', 'Reviewer', 'Due Date', 'Last Updated', 'Status']],
      body: submissions.map(s => [
        s.assignment?.template?.title ?? 'Unknown',
        s.submittedBy?.fullName ?? 'Unknown',
        s.reviewedBy?.fullName ?? '-',
        s.assignment?.dueDate ? formatDate(s.assignment.dueDate) : '—',
        formatDate(s.updatedAt),
        statusLabel(s.status),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 248, 250] },
    })

    doc.save(`g-list_report_${new Date().toISOString().split('T')[0]}.pdf`)
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
          <Download className="w-4 h-4" /> Export CSV / Excel
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
