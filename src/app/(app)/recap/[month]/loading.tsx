export default function RecapLoading() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="h-7 w-32 bg-gray-100 rounded-lg animate-pulse mb-6" />
      <div className="bg-surface rounded-2xl p-5 shadow-sm space-y-4">
        <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
        <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
        <div className="h-20 w-full bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-20 w-full bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    </div>
  )
}
