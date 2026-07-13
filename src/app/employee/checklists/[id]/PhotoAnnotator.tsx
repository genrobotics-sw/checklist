'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Check } from 'lucide-react'

export function PhotoAnnotator({ 
  file, 
  onSave, 
  onCancel 
}: { 
  file: File
  onSave: (annotatedFile: File) => void
  onCancel: () => void 
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [isDrawing, setIsDrawing] = useState(false)
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null)
  
  // Load image onto canvas
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const context = canvas.getContext('2d')
    if (!context) return
    setCtx(context)

    const img = new Image()
    img.onload = () => {
      // Set the internal canvas resolution to exactly match the original high-quality image!
      canvas.width = img.width
      canvas.height = img.height
      
      // Draw initial image at full resolution
      context.drawImage(img, 0, 0, img.width, img.height)
      
      // Setup drawing style (thick red line scaled to image resolution)
      context.strokeStyle = '#ef4444' // Red-500
      context.lineWidth = Math.max(5, img.width / 100) // Scale pen size to original image width
      context.lineCap = 'round'
      context.lineJoin = 'round'
    }
    
    const objectUrl = URL.createObjectURL(file)
    img.src = objectUrl
    
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  // Helper to map CSS mouse coordinates back to the high-res internal canvas coordinates
  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    
    const cssX = e.clientX - rect.left
    const cssY = e.clientY - rect.top
    
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    return {
      x: cssX * scaleX,
      y: cssY * scaleY
    }
  }

  // Drawing handlers
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!ctx || !canvasRef.current) return
    
    const { x, y } = getCoordinates(e)
    
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawing || !ctx || !canvasRef.current) return
    
    const { x, y } = getCoordinates(e)
    
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (!ctx) return
    ctx.closePath()
    setIsDrawing(false)
  }

  const handleSave = () => {
    if (!canvasRef.current) return
    
    canvasRef.current.toBlob((blob) => {
      if (!blob) return
      // Convert blob back to File
      const annotatedFile = new File([blob], file.name, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      })
      onSave(annotatedFile)
    }, 'image/jpeg', 0.9)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/95 backdrop-blur-sm p-4">
      <div className="flex flex-col w-full max-w-4xl max-h-full bg-zinc-900 rounded-xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800 text-white">
          <h3 className="font-medium">Draw to Highlight</h3>
          <button onClick={onCancel} className="p-1 rounded-full bg-zinc-800 text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas Area */}
        <div ref={containerRef} className="flex-1 flex items-center justify-center overflow-auto p-4 touch-none">
          <canvas
            ref={canvasRef}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            onPointerOut={stopDrawing}
            className="rounded shadow-2xl cursor-crosshair max-w-full max-h-full object-contain touch-none"
            style={{ touchAction: 'none' }} // Crucial for mobile drawing! Prevents scrolling
          />
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500"
          >
            <Check className="w-4 h-4 mr-2" />
            Done & Save
          </button>
        </div>
      </div>
    </div>
  )
}
