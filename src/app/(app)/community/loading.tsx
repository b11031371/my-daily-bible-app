export default function CommunityLoading() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
      <div className="h-7 w-12 bg-gray-100 rounded-lg animate-pulse" />
      <section>
        <div className="h-4 w-20 bg-gray-100 rounded animate-pulse mb-3" />
        <div className="bg-surface rounded-2xl shadow-sm overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
              <div className="h-5 w-5 bg-gray-100 rounded animate-pulse" />
              <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
              <div className="h-4 w-24 bg-gray-100 rounded animate-pulse flex-1" />
              <div className="h-4 w-10 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </section>
      <section>
        <div className="h-4 w-24 bg-gray-100 rounded animate-pulse mb-3" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-2xl p-4 shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-100 animate-pulse" />
                <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-3/4 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
