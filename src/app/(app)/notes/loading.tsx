export default function NotesLoading() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-2 space-y-4">
      <div className="h-7 w-20 bg-gray-100 rounded-lg animate-pulse" />

      {/* Hero card skeleton */}
      <div className="bg-gray-200 rounded-3xl p-6 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-5 w-10 bg-gray-300 rounded-full" />
          <div className="h-4 w-24 bg-gray-300 rounded" />
        </div>
        <div className="h-3 w-20 bg-gray-300 rounded mb-1" />
        <div className="h-7 w-48 bg-gray-300 rounded mb-4" />
        <div className="h-4 w-24 bg-gray-300 rounded" />
      </div>

      {/* Streak + week */}
      <div className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 w-24 bg-gray-100 rounded" />
          <div className="h-3 w-12 bg-gray-100 rounded" />
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full aspect-square rounded-lg bg-gray-100" />
              <div className="h-2 w-3 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Quick checkin skeleton */}
      <div className="h-14 bg-gray-200 rounded-2xl animate-pulse" />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-3 shadow-sm text-center animate-pulse">
            <div className="h-7 w-7 bg-gray-100 rounded-full mx-auto mb-0.5" />
            <div className="h-5 w-8 bg-gray-100 rounded mx-auto mb-1" />
            <div className="h-3 w-12 bg-gray-100 rounded mx-auto" />
          </div>
        ))}
      </div>

      {/* Community preview */}
      <div className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3 animate-pulse">
        <div className="flex -space-x-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white" />
          ))}
        </div>
        <div className="h-3 w-40 bg-gray-100 rounded" />
      </div>
    </div>
  )
}
