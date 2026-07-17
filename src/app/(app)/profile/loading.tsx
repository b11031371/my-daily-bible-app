export default function ProfileLoading() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="h-7 w-12 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-4 w-8 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="bg-surface rounded-2xl p-5 shadow-sm flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gray-100 animate-pulse" />
        <div className="space-y-2">
          <div className="h-5 w-24 bg-gray-100 rounded animate-pulse" />
          <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="h-8 w-8 bg-gray-100 rounded-full animate-pulse" />
            <div className="space-y-1">
              <div className="h-6 w-12 bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
      <div className="bg-surface rounded-2xl p-5 shadow-sm">
        <div className="h-4 w-10 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="h-8 w-8 bg-gray-100 rounded-full animate-pulse" />
              <div className="h-3 w-10 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
