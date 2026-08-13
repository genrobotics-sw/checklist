'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Video, Send, Save, MapPin, AlertCircle, CheckCircle2, MessageSquare, Loader2, X, Pencil, PlayCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import imageCompression from 'browser-image-compression'
import { PhotoAnnotator } from './PhotoAnnotator'

type Item = {
  id: string
  label: string
  description?: string | null
  type: 'REQUIRED' | 'OPTIONAL'
  requiresPhoto: boolean
  requiresVideo: boolean
}

type PhotoData = {
  url: string
  path: string
  name: string
}

type SubmissionItem = {
  id?: string
  itemId: string
  isChecked: boolean
  note?: string | null
  photos?: PhotoData[]
  videos?: PhotoData[]
}

export function ChecklistForm({ 
  submissionId, 
  templateTitle,
  templateCategory,
  templateDescription,
  items, 
  initialData, 
  isReadOnly,
  comments = [],
  initialLocation = ''
}: { 
  submissionId: string
  templateTitle: string
  templateCategory?: string | null
  templateDescription?: string | null
  items: Item[]
  initialData: Record<string, SubmissionItem>
  isReadOnly: boolean
  comments?: any[]
  initialLocation?: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [formData, setFormData] = useState<Record<string, SubmissionItem>>(initialData)
  const [location, setLocation] = useState(initialLocation || '')
  const [uploadingItem, setUploadingItem] = useState<string | null>(null)
  const [uploadingVideoItem, setUploadingVideoItem] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [annotatingFile, setAnnotatingFile] = useState<{ itemId: string, file: File } | null>(null)
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null)
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState<string | null>(null)

  const completedRequired = items.filter(i => i.type === 'REQUIRED' && formData[i.id]?.isChecked).length
  const totalRequired = items.filter(i => i.type === 'REQUIRED').length
  const progressPercent = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 100

  const handleToggle = (itemId: string, isChecked: boolean) => {
    if (isReadOnly) return
    setFormData(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || { itemId }), isChecked }
    }))
    // Clear error when user checks the box
    setItemErrors(prev => { const n = {...prev}; delete n[itemId]; return n })
  }

  const handleTextChange = (itemId: string, value: string) => {
    if (isReadOnly) return
    setFormData(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || { itemId, isChecked: false }), note: value }
    }))
  }

  const handlePhotoUpload = async (itemId: string, file: File) => {
    if (isReadOnly) return

    const MAX_RETRIES = 3
    const UPLOAD_TIMEOUT_MS = 30_000 // 30 seconds per attempt

    try {
      setUploadingItem(itemId)
      // Clear any previous upload error for this item
      setItemErrors(prev => { const n = { ...prev }; delete n[`upload_${itemId}`]; return n })

      // Step 1: Compress the image client-side
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1600, useWebWorker: true, initialQuality: 0.85 }
      const compressedFile = await imageCompression(file, options)
      const fileExt = compressedFile.name.split('.').pop() || 'jpg'
      const fileName = `${submissionId}/${itemId}-${Date.now()}.${fileExt}`

      // Step 2: Upload with retry loop and per-attempt timeout
      let lastError: any = null
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS)
        try {
          const { error } = await supabase.storage
            .from('checklist-photos')
            .upload(fileName, compressedFile, {
              upsert: attempt > 1, // allow overwrite on retry
            })
          clearTimeout(timeoutId)
          if (error) {
            // 504 / network-level errors — worth retrying
            const isRetryable = error.message?.includes('504') ||
              error.message?.includes('network') ||
              error.message?.includes('timeout') ||
              error.message?.includes('fetch')
            if (isRetryable && attempt < MAX_RETRIES) {
              // Exponential back-off: 1s, 2s, 4s
              await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)))
              lastError = error
              continue
            }
            throw error
          }
          // Upload succeeded — get the public URL
          const { data: { publicUrl } } = supabase.storage.from('checklist-photos').getPublicUrl(fileName)
          const newPhoto = { url: publicUrl, path: fileName, name: compressedFile.name }
          setFormData(prev => {
            const existing = prev[itemId] || { itemId, isChecked: false }
            return { ...prev, [itemId]: { ...existing, photos: [...(existing.photos || []), newPhoto] } }
          })
          lastError = null
          break // success — exit retry loop
        } catch (err: any) {
          clearTimeout(timeoutId)
          if (err?.name === 'AbortError') {
            lastError = new Error(`Upload timed out (attempt ${attempt}/${MAX_RETRIES}). Check your internet connection.`)
          } else {
            lastError = err
          }
          if (attempt < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)))
          }
        }
      }

      if (lastError) {
        console.error('Photo upload failed after retries:', lastError)
        const msg = lastError.message?.includes('timed out')
          ? 'Upload timed out — your connection may be slow. Please try again.'
          : `Upload failed: ${lastError.message || 'Please try again.'}`
        setItemErrors(prev => ({ ...prev, [`upload_${itemId}`]: msg }))
      }
    } catch (error: any) {
      console.error('Error during photo processing:', error)
      setItemErrors(prev => ({ ...prev, [`upload_${itemId}`]: 'Could not process photo. Please try a different image.' }))
    } finally {
      setUploadingItem(null)
    }
  }

  const handleVideoUpload = async (itemId: string, file: File) => {
    if (isReadOnly) return

    const MAX_FILE_SIZE_MB = 50
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setItemErrors(prev => ({ ...prev, [`upload_video_${itemId}`]: `Video exceeds ${MAX_FILE_SIZE_MB}MB limit.` }))
      return
    }

    // Check video duration — must be ≤ 10 seconds
    const durationOk = await new Promise<boolean>(resolve => {
      const tempUrl = URL.createObjectURL(file)
      const vid = document.createElement('video')
      vid.preload = 'metadata'
      vid.onloadedmetadata = () => {
        URL.revokeObjectURL(tempUrl)
        resolve(vid.duration <= 10)
      }
      vid.onerror = () => { URL.revokeObjectURL(tempUrl); resolve(false) }
      vid.src = tempUrl
    })

    if (!durationOk) {
      setItemErrors(prev => ({ ...prev, [`upload_video_${itemId}`]: 'Video must be 10 seconds or less.' }))
      return
    }

    try {
      setUploadingVideoItem(itemId)
      setItemErrors(prev => { const n = { ...prev }; delete n[`upload_video_${itemId}`]; return n })

      const fileExt = file.name.split('.').pop() || 'mp4'
      const fileName = `${submissionId}/${itemId}-${Date.now()}.${fileExt}`

      const { error } = await supabase.storage
        .from('checklist-videos')
        .upload(fileName, file, {
          upsert: true,
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage.from('checklist-videos').getPublicUrl(fileName)
      const newVideo = { url: publicUrl, path: fileName, name: file.name }
      
      setFormData(prev => {
        const existing = prev[itemId] || { itemId, isChecked: false }
        return { ...prev, [itemId]: { ...existing, videos: [...(existing.videos || []), newVideo] } }
      })
    } catch (error: any) {
      console.error('Error during video processing:', error)
      setItemErrors(prev => ({ ...prev, [`upload_video_${itemId}`]: 'Could not upload video. Please try again.' }))
    } finally {
      setUploadingVideoItem(null)
    }
  }

  const removePhoto = (itemId: string, indexToRemove: number) => {
    if (isReadOnly) return
    setFormData(prev => {
      const existing = prev[itemId]
      if (!existing || !existing.photos) return prev
      return { ...prev, [itemId]: { ...existing, photos: existing.photos.filter((_, idx) => idx !== indexToRemove) } }
    })
  }

  const removeVideo = (itemId: string, indexToRemove: number) => {
    if (isReadOnly) return
    setFormData(prev => {
      const existing = prev[itemId]
      if (!existing || !existing.videos) return prev
      return { ...prev, [itemId]: { ...existing, videos: existing.videos.filter((_, idx) => idx !== indexToRemove) } }
    })
  }

  const handleSave = async (submitForReview = false) => {
    try {
      if (submitForReview) setSubmitting(true)
      else setSaving(true)

      setSaveError(null)

      if (submitForReview) {
        if (!location || !location.trim()) {
          setSaveError('Location is required before submitting.')
          setSubmitting(false)
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }

        const newErrors: Record<string, string> = {}
        for (const item of items) {
          if (item.type === 'REQUIRED') {
            const ans = formData[item.id]
            if (!ans?.isChecked) {
              newErrors[item.id] = 'This item must be checked before submitting.'
            } else if (item.requiresPhoto && (!ans.photos || ans.photos.length === 0)) {
              newErrors[item.id] = 'A photo is required for this item.'
            } else if (item.requiresVideo && (!ans.videos || ans.videos.length === 0)) {
              newErrors[item.id] = 'A video is required for this item.'
            }
          }
        }
        if (Object.keys(newErrors).length > 0) {
          setItemErrors(newErrors)
          setSubmitting(false)
          // Scroll to first error
          const firstErrId = Object.keys(newErrors)[0]
          document.getElementById(`item-${firstErrId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          return
        }
        setItemErrors({})
      }

      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: Object.values(formData), location, submitForReview })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save')
      }

      // Only navigate away when actually submitting for review.
      // Draft saves keep the user on the same page — the client state
      // is already up to date, so no server re-render is needed.
      if (submitForReview) router.push('/employee/checklists')
    } catch (error: any) {
      console.error(error)
      setSaveError(error.message || 'Failed to save. Please try again.')
    } finally {
      setSubmitting(false)
      setSaving(false)
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-4 pb-36"
      >
        {/* Header Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-xl font-bold leading-tight">{templateTitle}</h1>
              {(templateCategory || templateDescription) && (
                <div className="mt-1 space-y-0.5">
                  {templateCategory && (
                    <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider">{templateCategory}</p>
                  )}
                  {templateDescription && (
                    <p className="text-indigo-200 text-sm">{templateDescription}</p>
                  )}
                </div>
              )}
              <p className="text-indigo-300 text-xs mt-2">
                {isReadOnly ? 'Submitted — Read Only' : `${completedRequired} of ${totalRequired} required tasks done`}
              </p>
            </div>
            {isReadOnly ? (
              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
                <CheckCircle2 className="w-3.5 h-3.5" /> Done
              </span>
            ) : (
              <span className="shrink-0 text-2xl font-bold text-white">{progressPercent}%</span>
            )}
          </div>

          {/* Progress Bar */}
          {!isReadOnly && (
            <div className="mt-4">
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}

          {/* Location Field */}
          <div className="mt-4">
            <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-1.5">
              Location <span className="text-rose-300">*</span>
            </label>
            <div className={`flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 shadow-sm border-2 transition-colors ${saveError?.includes('Location') ? 'border-rose-400' : 'border-transparent'}`}>
              <MapPin className={`w-4 h-4 shrink-0 ${saveError?.includes('Location') ? 'text-rose-400' : 'text-indigo-400'}`} />
              <input
                type="text"
                value={location}
                onChange={e => {
                  setLocation(e.target.value)
                  if (saveError?.includes('Location')) setSaveError(null)
                }}
                disabled={isReadOnly}
                placeholder="Enter location..."
                className="flex-1 bg-transparent text-zinc-800 placeholder-zinc-400 text-sm focus:outline-none disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* Review Comments */}
        <AnimatePresence>
          {comments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-3"
            >
              <div className="flex items-center gap-2 text-amber-800">
                <MessageSquare className="w-4 h-4" />
                <span className="font-semibold text-sm">Reviewer Comments</span>
              </div>
              {comments.map((c: any) => (
                <div key={c.id} className="bg-white rounded-xl p-3 border border-amber-100">
                  <p className="text-xs font-semibold text-amber-700 mb-1">{c.author.fullName}</p>
                  <p className="text-sm text-zinc-700">{c.body}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Checklist Items */}
        <div className="space-y-3">
          {items.map((item, index) => {
            const ans = formData[item.id] || { itemId: item.id, isChecked: false }
            const isChecked = ans.isChecked
            const photos = ans.photos || []
            const videos = ans.videos || []
            const isUploading = uploadingItem === item.id
            const isUploadingVideo = uploadingVideoItem === item.id
            const itemError = itemErrors[item.id] || itemErrors[`upload_${item.id}`] || itemErrors[`upload_video_${item.id}`]

            return (
              <div
                key={item.id}
                id={`item-${item.id}`}
                className={`rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
                  itemError
                    ? 'border-rose-400 bg-rose-50/40'
                    : isChecked
                    ? 'border-indigo-200 bg-indigo-50/60'
                    : 'border-zinc-200 bg-white'
                }`}
              >
                {/* Item Header - Tappable toggle */}
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => handleToggle(item.id, !isChecked)}
                  className="w-full text-left p-4 flex items-start gap-3 active:bg-zinc-50 transition-colors disabled:cursor-default"
                >
                  {/* Custom Checkbox */}
                  <div className={`mt-0.5 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                    isChecked
                      ? 'bg-indigo-600 border-indigo-600'
                      : 'border-zinc-300 bg-white'
                  }`}>
                    <AnimatePresence>
                      {isChecked && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        >
                          <CheckCircle2 className="w-4 h-4 text-white" fill="currentColor" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold text-sm leading-snug transition-colors ${isChecked ? 'text-indigo-700' : 'text-zinc-900'}`}>
                        {item.label}
                      </span>
                      {item.type === 'REQUIRED' && (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          isChecked ? 'bg-indigo-100 text-indigo-600' : 'bg-red-50 text-red-600'
                        }`}>
                          Required
                        </span>
                      )}
                      {item.requiresPhoto && (
                        <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium bg-zinc-100 text-zinc-600">
                          <Camera className="w-2.5 h-2.5" /> Photo
                        </span>
                      )}
                      {item.requiresVideo && (
                        <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium bg-zinc-100 text-zinc-600">
                          <Video className="w-2.5 h-2.5" /> Video
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{item.description}</p>
                    )}
                  </div>
                </button>

                {/* Photo & Video Section */}
                {(item.requiresPhoto || item.requiresVideo) && (
                  <div className="px-4 pb-3 pt-1 border-t border-zinc-100">
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {/* Existing Photos */}
                      {photos.map((photo, idx) => (
                        <div key={`photo-${idx}`} className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewPhoto(photo.url)}
                            className="block"
                          >
                            <img
                              src={photo.url}
                              alt={`Photo ${idx + 1}`}
                              className="h-20 w-20 object-cover rounded-xl border border-zinc-200"
                            />
                          </button>
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => removePhoto(item.id, idx)}
                              className="absolute -top-1.5 -right-1.5 bg-white text-red-500 rounded-full w-5 h-5 flex items-center justify-center shadow border border-zinc-200 hover:bg-red-50"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Existing Videos */}
                      {videos.map((video, idx) => (
                        <div key={`video-${idx}`} className="relative shrink-0">
                          <a
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block h-20 w-20 bg-zinc-800 rounded-xl border border-zinc-200 overflow-hidden flex flex-col items-center justify-center text-zinc-300 hover:bg-zinc-700 transition"
                          >
                            <PlayCircle className="w-6 h-6 mb-1 shrink-0" />
                            <span className="text-[9px] font-medium w-full px-1 text-center truncate">{video.name}</span>
                          </a>
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => removeVideo(item.id, idx)}
                              className="absolute -top-1.5 -right-1.5 bg-white text-red-500 rounded-full w-5 h-5 flex items-center justify-center shadow border border-zinc-200 hover:bg-red-50"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Upload Photo Button */}
                      {!isReadOnly && item.requiresPhoto && (
                        <label className={`shrink-0 flex flex-col items-center justify-center h-20 w-20 rounded-xl border-2 border-dashed cursor-pointer transition-all active:scale-95 ${
                          isUploading
                            ? 'border-indigo-300 bg-indigo-50'
                            : 'border-zinc-300 bg-zinc-50 hover:border-indigo-400 hover:bg-indigo-50'
                        }`}>
                          {isUploading ? (
                            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                          ) : (
                            <>
                              <Camera className="w-5 h-5 text-zinc-400 mb-1" />
                              <span className="text-[10px] font-medium text-zinc-500">Add Photo</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            disabled={isReadOnly || isUploading}
                            onChange={e => {
                              const file = e.target.files?.[0]
                              if (file) setAnnotatingFile({ itemId: item.id, file })
                              e.target.value = ''
                            }}
                          />
                        </label>
                      )}

                      {/* Upload Video Button */}
                      {!isReadOnly && item.requiresVideo && (
                        <label className={`shrink-0 flex flex-col items-center justify-center h-20 w-20 rounded-xl border-2 border-dashed cursor-pointer transition-all active:scale-95 ${
                          isUploadingVideo
                            ? 'border-indigo-300 bg-indigo-50'
                            : 'border-zinc-300 bg-zinc-50 hover:border-indigo-400 hover:bg-indigo-50'
                        }`}>
                          {isUploadingVideo ? (
                            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                          ) : (
                            <>
                              <Video className="w-5 h-5 text-zinc-400 mb-1" />
                              <span className="text-[10px] font-medium text-zinc-500">Video (≤10s)</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="video/*"
                            capture="environment"
                            className="hidden"
                            disabled={isReadOnly || isUploadingVideo}
                            onChange={e => {
                              const file = e.target.files?.[0]
                              if (file) handleVideoUpload(item.id, file)
                              e.target.value = ''
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes Field */}
                <div className="px-4 pb-4 pt-1">
                  <input
                    type="text"
                    placeholder={isReadOnly ? 'No notes' : 'Add a note... (optional)'}
                    value={ans.note || ''}
                    onChange={e => handleTextChange(item.id, e.target.value)}
                    disabled={isReadOnly}
                    className="block w-full rounded-xl text-sm px-3 py-2.5 border border-zinc-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder-zinc-400 text-zinc-800 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:text-zinc-500 disabled:placeholder-zinc-300 transition"
                  />
                </div>

                {/* Inline Error Message (validation + upload errors) */}
                {itemError && (
                  <div className="px-4 pb-3 flex items-center gap-2 text-rose-600">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs font-semibold">{itemError}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Read-Only Status Banner */}
        {isReadOnly && (
          <div className="flex items-center gap-3 rounded-2xl bg-green-50 border border-green-200 p-4">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <p className="text-sm font-medium text-green-800">This checklist has been submitted and is locked for editing.</p>
          </div>
        )}
      </motion.div>

      {/* Sticky Action Bar */}
      {!isReadOnly && (
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-20 bg-white/80 backdrop-blur-md border-t border-zinc-200 px-4 py-3 safe-b">
          {saveError && (
            <div className="mb-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 flex items-center gap-2">
              <span>⚠</span> {saveError}
            </div>
          )}
          <div className="max-w-3xl mx-auto flex gap-3">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving || submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-zinc-700 bg-zinc-100 rounded-xl hover:bg-zinc-200 active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving || submitting}
              className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? 'Submitting…' : 'Submit for Review'}
            </button>
          </div>
        </div>
      )}

      {/* Photo Annotator Modal */}
      {annotatingFile && (
        <PhotoAnnotator
          file={annotatingFile.file}
          onSave={annotatedFile => {
            handlePhotoUpload(annotatingFile.itemId, annotatedFile)
            setAnnotatingFile(null)
          }}
          onCancel={() => setAnnotatingFile(null)}
        />
      )}

      {/* Photo Preview Lightbox */}
      <AnimatePresence>
        {previewPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setPreviewPhoto(null)}
          >
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 right-4 bg-white/10 rounded-full p-2 text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={previewPhoto}
              alt="Preview"
              className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
