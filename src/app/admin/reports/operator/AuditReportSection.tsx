'use client'

import { useState, useEffect } from 'react'
import { FileText, Loader2, Calendar } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface TemplateItem {
  id: string
  label: string
  sortOrder: number
}

interface Template {
  id: string
  title: string
  items: TemplateItem[]
}

interface AuditReportSectionProps {
  operatorId: string
  operatorName: string
  auditTemplates: Template[]
}

export function AuditReportSection({ operatorId, operatorName, auditTemplates }: AuditReportSectionProps) {
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [selectedTemplateId, setSelectedTemplateId] = useState(auditTemplates[0]?.id || '')
  
  const [loading, setLoading] = useState(false)
  const [submissions, setSubmissions] = useState<any[]>([])

  useEffect(() => {
    if (!selectedTemplateId) return

    const fetchAuditData = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/reports/operator/${operatorId}/audit?templateId=${selectedTemplateId}&month=${selectedMonth}&year=${selectedYear}`)
        if (res.ok) {
          const { data } = await res.json()
          setSubmissions(data)
        }
      } catch (err) {
        console.error('Failed to fetch audit data', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAuditData()
  }, [operatorId, selectedTemplateId, selectedMonth, selectedYear])

  if (auditTemplates.length === 0) {
    return null
  }

  const selectedTemplate = auditTemplates.find(t => t.id === selectedTemplateId)
  if (!selectedTemplate) return null

  // Calculate days in the selected month
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Map submissions by day (using submittedAt)
  const submissionsByDay: Record<number, any> = {}
  submissions.forEach(sub => {
    if (sub.submittedAt) {
      const date = new Date(sub.submittedAt)
      submissionsByDay[date.getDate()] = sub
    }
  })

  // Function to handle PDF Export
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' })
    
    doc.setFontSize(14)
    doc.text(`Audit Report — ${selectedTemplate.title}`, 14, 15)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Operator: ${operatorName}   ·   Month: ${monthName} ${selectedYear}`, 14, 22)

    const head = [['Task / Day', ...days.map(d => d.toString())]]
    
    const body = selectedTemplate.items.map(item => {
      const rowData = days.map(day => {
        const sub = submissionsByDay[day]
        if (!sub) return '-'
        const subItem = sub.items?.find((i: any) => i.checklistItemId === item.id)
        return subItem?.isChecked ? '✓' : '✗'
      })
      return [item.label, ...rowData]
    })

    doc.setTextColor(0)
    autoTable(doc, {
      startY: 28,
      head: head,
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], fontSize: 8, halign: 'center' },
      bodyStyles: { fontSize: 8, halign: 'center' },
      columnStyles: {
        0: { halign: 'left', cellWidth: 60 }
      },
      styles: {
        font: 'helvetica',
        cellPadding: 1.5,
        minCellHeight: 6,
      }
    })

    const safeOpName = operatorName.toLowerCase().replace(/[^a-z0-9]/g, '_')
    const fileName = `${safeOpName}_${monthName.toLowerCase()}-${selectedYear}.pdf`
    doc.save(fileName)
  }

  return (
    <div className="bg-white shadow-sm ring-1 ring-zinc-200 rounded-lg overflow-hidden mt-8">
      <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-medium text-zinc-900">Monthly Audit Report</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <select 
            value={selectedTemplateId} 
            onChange={e => setSelectedTemplateId(e.target.value)}
            className="rounded-md border-zinc-300 text-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-1.5 border"
          >
            {auditTemplates.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>

          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            className="rounded-md border-zinc-300 text-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-1.5 border"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i).toLocaleString('default', { month: 'short' })}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="rounded-md border-zinc-300 text-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-1.5 border"
          >
            {[currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 ring-1 ring-inset ring-indigo-600/20 hover:bg-indigo-100 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      <div className="p-0 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <table className="min-w-full divide-y divide-zinc-200 border-b border-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <th className="sticky left-0 z-10 bg-zinc-50 px-4 py-3 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider border-r border-zinc-200 min-w-[250px] shadow-[1px_0_0_0_#e4e4e7]">
                  Task / Day
                </th>
                {days.map(day => (
                  <th key={day} className="px-2 py-3 text-center text-xs font-semibold text-zinc-500 min-w-[36px]">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-zinc-100">
              {selectedTemplate.items.map(item => (
                <tr key={item.id} className="hover:bg-zinc-50">
                  <td className="sticky left-0 z-10 bg-white hover:bg-zinc-50 px-4 py-2.5 text-xs font-medium text-zinc-900 border-r border-zinc-200 shadow-[1px_0_0_0_#e4e4e7]">
                    {item.label}
                  </td>
                  {days.map(day => {
                    const sub = submissionsByDay[day]
                    if (!sub) return <td key={day} className="px-2 py-2.5 text-center text-zinc-200">—</td>
                    
                    const subItem = sub.items?.find((i: any) => i.checklistItemId === item.id)
                    const isChecked = subItem?.isChecked

                    return (
                      <td key={day} className="px-2 py-2.5 text-center">
                        {isChecked ? (
                          <span className="text-green-600 font-bold">✓</span>
                        ) : (
                          <span className="text-red-500 font-bold">✗</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
