import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="w-full max-w-6xl mx-auto p-6 md:p-8 space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="h-8 bg-zinc-200 rounded-md w-1/4"></div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-5 rounded-lg border border-zinc-100 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-10 w-10 bg-zinc-100 rounded-full"></div>
              <div className="h-4 bg-zinc-200 rounded w-1/3"></div>
            </div>
            <div className="h-6 bg-zinc-200 rounded w-1/2 mt-2"></div>
          </div>
        ))}
      </div>

      {/* Table/List Skeleton */}
      <div className="bg-white rounded-lg border border-zinc-100 shadow-sm p-6 space-y-4">
        <div className="h-6 bg-zinc-200 rounded w-1/4 mb-6"></div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex justify-between items-center py-3 border-b border-zinc-50 last:border-0">
            <div className="space-y-2 w-1/2">
              <div className="h-4 bg-zinc-200 rounded w-3/4"></div>
              <div className="h-3 bg-zinc-100 rounded w-1/2"></div>
            </div>
            <div className="h-8 w-24 bg-zinc-100 rounded"></div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-center mt-8">
        <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
      </div>
    </div>
  )
}
