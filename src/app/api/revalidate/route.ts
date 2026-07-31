import { revalidateTag, revalidatePath } from 'next/cache'
import { NextRequest, NextResponse, after } from 'next/server'
import { syncNoteMeta } from '@/lib/note-meta'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret')
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  revalidateTag('bible-notes', { expire: 0 })
  revalidatePath('/notes')
  revalidatePath('/notes/[date]', 'page')

  // 順手把新筆記的經文範圍寫進 note_meta，月回顧才有東西可顯示。
  // 放在 after 裡：上傳腳本（skill 的 revalidate.py）只等 10 秒，而抓筆記要下載
  // 整份 markdown，不該讓它為了這件事逾時。快取標籤已在上面失效，所以這裡抓到的
  // 目錄清單一定含剛上傳的日期。
  after(async () => {
    const result = await syncNoteMeta()
    if (result.synced) console.log('[revalidate] note_meta synced', result)
  })

  return NextResponse.json({ revalidated: true, at: new Date().toISOString() })
}
