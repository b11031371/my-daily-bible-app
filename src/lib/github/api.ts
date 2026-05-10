const OWNER = 'b11031371'
const REPO = 'my_bible_notes'
const BRANCH = 'main'

const RAW_BASE = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}`
const API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}`

export async function fetchAvailableDates(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/contents/`, {
    next: { revalidate: 3600 },
  })
  if (!res.ok) return []
  const items: { name: string; type: string }[] = await res.json()
  return items
    .filter(i => i.type === 'dir' && /^\d{4}-\d{2}-\d{2}$/.test(i.name))
    .map(i => i.name)
    .sort((a, b) => b.localeCompare(a))
}

export async function fetchMarkdown(date: string, lang: 'zh' | 'en'): Promise<string | null> {
  const filename = lang === 'zh' ? 'note_zh.md' : 'note_en.md'
  const res = await fetch(`${RAW_BASE}/${date}/${filename}`, {
    next: { revalidate: 3600 },
  })
  if (!res.ok) return null
  return res.text()
}

export function getPdfUrl(date: string, lang: 'zh' | 'en'): string {
  const filename = lang === 'zh' ? 'note_zh.pdf' : 'note_en.pdf'
  return `https://${OWNER}.github.io/${REPO}/${date}/${filename}`
}
