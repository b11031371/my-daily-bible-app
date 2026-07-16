const OWNER = 'b11031371'
const REPO = 'my_bible_notes'
const BRANCH = 'main'

const RAW_BASE = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}`
const API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}`

export async function fetchAvailableDates(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/contents/`, {
    next: { revalidate: 3600, tags: ['bible-notes'] },
  })
  if (!res.ok) return []
  const items: { name: string; type: string }[] = await res.json()
  return items
    .filter(i => i.type === 'dir' && /^\d{4}-\d{2}-\d{2}$/.test(i.name))
    .map(i => i.name)
    .sort((a, b) => b.localeCompare(a))
}

// 讀出經文範圍。noteLang='zh' 讀和合本欄位（中文書卷名），'en' 讀英文譯本
// 欄位（NKJV/KJV，英文書卷名）。英文版缺檔或抓不到時退回中文。
export async function fetchPassageRange(date: string, noteLang: 'zh' | 'en' = 'zh'): Promise<string | null> {
  const md = await fetchMarkdown(date, noteLang)
  if (!md) {
    return noteLang === 'zh' ? null : fetchPassageRange(date, 'zh')
  }
  const re = noteLang === 'zh'
    ? /\*\*和合本[：:]\*\*\s*(.+)/
    : /\*\*(?:NKJV|KJV|NIV|NRSV|ESV)[：:]\*\*\s*(.+)/
  const match = md.match(re)
  if (match) return match[1].trim()
  return noteLang === 'zh' ? null : fetchPassageRange(date, 'zh')
}

export async function fetchMarkdown(date: string, lang: 'zh' | 'en'): Promise<string | null> {
  const filename = lang === 'zh' ? 'note_zh.md' : 'note_en.md'
  const res = await fetch(`${RAW_BASE}/${date}/${filename}`, {
    next: { revalidate: 3600, tags: ['bible-notes'] },
  })
  if (!res.ok) return null
  return res.text()
}

export function getPdfUrl(date: string, lang: 'zh' | 'en'): string {
  const filename = lang === 'zh' ? 'note_zh.pdf' : 'note_en.pdf'
  return `https://${OWNER}.github.io/${REPO}/${date}/${filename}`
}
