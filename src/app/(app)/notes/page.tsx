import Link from 'next/link'
import { fetchAvailableDates } from '@/lib/github/api'
import { formatDateZH, formatDateShort } from '@/lib/utils'

export default async function NotesPage() {
  const dates = await fetchAvailableDates()
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#1a1a1a]">讀經筆記</h1>
        <span className="text-xs text-gray-400">{dates.length} 篇</span>
      </div>

      {dates.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">尚無筆記</div>
      )}

      <div className="space-y-2">
        {dates.map(date => {
          const isToday = date === today
          return (
            <Link
              key={date}
              href={`/notes/${date}`}
              className="flex items-center justify-between bg-white rounded-2xl px-5 py-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                {isToday && (
                  <span className="text-xs bg-[#4a7c59] text-white px-2 py-0.5 rounded-full font-medium">今日</span>
                )}
                <div>
                  <p className="text-sm font-medium text-[#1a1a1a]">{formatDateZH(date)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDateShort(date)}</p>
                </div>
              </div>
              <span className="text-gray-300 text-lg">›</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
