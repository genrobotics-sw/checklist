'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, GripVertical, Loader2 } from 'lucide-react'

export default function EditTemplatePage(props: { params: Promise<{ templateId: string }> }) {
  const params = use(props.params)
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [items, setItems] = useState<{ id: string, label: string, type: 'REQUIRED' | 'OPTIONAL', requiresPhoto: boolean }[]>([])

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const res = await fetch(`/api/templates/${params.templateId}`)
        if (!res.ok) throw new Error('Failed to load template')
        const { data } = await res.json()
        
        setTitle(data.title)
        setDescription(data.description || '')
        setCategory(data.category)
        setItems(data.items.map((item: any) => ({
          id: item.id,
          label: item.label,
          type: item.type,
          requiresPhoto: item.requiresPhoto
        })))
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchTemplate()
  }, [params.templateId])

  const handleAddItem = () => {
    setItems([...items, { id: crypto.randomUUID(), label: '', type: 'REQUIRED', requiresPhoto: false }])
  }

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const handleItemChange = (id: string, field: string, value: string | boolean) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/templates/${params.templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          category,
          items: items.map((item, index) => ({ 
            id: item.id,
            label: item.label, 
            type: item.type, 
            requiresPhoto: item.requiresPhoto,
            sortOrder: index 
          }))
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update template')
      }

      router.push('/admin/templates')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Edit Template</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm ring-1 ring-zinc-200">
          <h2 className="text-lg font-medium text-zinc-900">Template Details</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Title</label>
              <input 
                required 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" 
                placeholder="e.g., Daily Forklift Inspection"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">Category</label>
              <input 
                required 
                type="text" 
                value={category} 
                onChange={e => setCategory(e.target.value)}
                className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" 
                placeholder="e.g., Equipment"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">Description (Optional)</label>
              <textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" 
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm ring-1 ring-zinc-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-zinc-900">Checklist Items</h2>
            <button 
              type="button" 
              onClick={handleAddItem}
              className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              <Plus className="mr-1 h-4 w-4" /> Add Item
            </button>
          </div>
          
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={item.id} className="flex items-start gap-4 p-4 rounded-lg border border-zinc-200 bg-zinc-50">
                <div className="mt-2 text-zinc-400 cursor-move">
                  <GripVertical className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="sr-only">Label</label>
                    <input 
                      required 
                      type="text" 
                      value={item.label}
                      onChange={e => handleItemChange(item.id, 'label', e.target.value)}
                      className="block w-full rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" 
                      placeholder="Item description (e.g., Check tire pressure)"
                    />
                  </div>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input 
                        type="checkbox" 
                        checked={item.requiresPhoto}
                        onChange={e => handleItemChange(item.id, 'requiresPhoto', e.target.checked)}
                        className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600"
                      />
                      Requires Photo Proof
                    </label>
                    <select 
                      value={item.type}
                      onChange={e => handleItemChange(item.id, 'type', e.target.value)}
                      className="rounded-md border-zinc-300 text-sm focus:border-indigo-500 focus:ring-indigo-500 border px-2 py-1"
                    >
                      <option value="REQUIRED">Required</option>
                      <option value="OPTIONAL">Optional</option>
                    </select>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={items.length === 1}
                  className="mt-2 text-zinc-400 hover:text-red-500 disabled:opacity-50"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button 
            type="button" 
            onClick={() => router.back()}
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={saving || items.length === 0}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Update Template'}
          </button>
        </div>
      </form>
    </div>
  )
}
