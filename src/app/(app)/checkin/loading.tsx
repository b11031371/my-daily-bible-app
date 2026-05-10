export default function CheckinLoading() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="h-7 w-24 bg-gray-100 rounded-lg animate-pulse mb-6" />
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 text-center shadow-sm">
              <div className="h-8 w-8 bg-gray-100 rounded-full animate-pulse mx-auto mb-1" />
              <div className="h-6 w-12 bg-gray-100 rounded animate-pulse mx-auto mb-1" />
              <div className="h-3 w-14 bg-gray-100 rounded animate-pulse mx-auto" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mb-3" />
          <div className="h-14 w-full bg-gray-100 rounded-xl animate-pulse" />
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="h-4 w-28 bg-gray-100 rounded animate-pulse mb-3" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="space-y-1">
                  <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="h-7 w-12 bg-gray-100 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
