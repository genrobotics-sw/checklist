import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-zinc-200 rounded-md w-1/3"></div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-zinc-100 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-4 bg-zinc-200 rounded-full"></div>
              <div className="h-3 bg-zinc-200 rounded w-16"></div>
            </div>
            <div className="h-6 bg-zinc-200 rounded w-10 mt-1"></div>
          </div>
        ))}
      </div>

      {/* To Do List Skeleton */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-100 space-y-4">
        <div className="h-6 bg-zinc-200 rounded w-1/4 mb-4"></div>
        
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center p-4 rounded-md bg-zinc-50 border border-zinc-100">
              <div className="space-y-2 w-3/4">
                <div className="h-4 bg-zinc-200 rounded w-1/2"></div>
                <div className="h-3 bg-zinc-200 rounded w-1/3"></div>
              </div>
              <div className="h-6 w-6 bg-zinc-200 rounded-full"></div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 text-zinc-300 animate-spin" />
      </div>
    </div>
  )
}
