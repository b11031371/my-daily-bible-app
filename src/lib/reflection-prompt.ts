import { createHash } from 'crypto'
import { generateText } from '@/lib/ai'

export { PROMPT_SWAP_LIMIT, type ReflectionPromptResponse } from '@/lib/reflection-prompt-shared'

// 筆記是固定格式（見 my-daily-bible-note skill）：中文用「三、經文分析」「四、問題反思」，
// 英文用 "III. Passage Analysis" "IV. Reflection Question"。只認編號，標題字樣改了也抓得到。
const SECTION_HEADINGS: Record<'zh' | 'en', { analysis: RegExp; reflection: RegExp }> = {
  zh: { analysis: /^##\s*三、/, reflection: /^##\s*四、/ },
  en: { analysis: /^##\s*III\./, reflection: /^##\s*IV\./ },
}

// 兩段加起來的上限。筆記這兩段平常不到一千字，這裡只是防止哪天格式跑掉、
// 把整份筆記都當成一段送進去。
const MAX_SOURCE_CHARS = 3000

/** 取出某個 `## ` 標題底下、到下一個 `## ` 標題為止的內容。 */
function sectionAfter(lines: string[], heading: RegExp): string {
  const start = lines.findIndex(line => heading.test(line.trim()))
  if (start === -1) return ''
  const body: string[] = []
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/.test(line.trim())) break
    body.push(line)
  }
  return body
    .filter(line => line.trim() !== '---')
    .join('\n')
    .replace(/\s*\[\d+\]/g, '') // 參考來源的註腳記號，對寫心得沒有幫助
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * 從筆記 markdown 取出餵給 AI 的材料：「經文分析」＋「問題反思」。
 * 兩段都找不到時回 null（舊格式筆記或只有 PDF），呼叫端就不產生建議。
 */
export function extractPromptSource(markdown: string, lang: 'zh' | 'en'): string | null {
  const lines = markdown.split('\n')
  const { analysis, reflection } = SECTION_HEADINGS[lang]
  const parts = [sectionAfter(lines, analysis), sectionAfter(lines, reflection)].filter(Boolean)
  if (parts.length === 0) return null
  return parts.join('\n\n').slice(0, MAX_SOURCE_CHARS)
}

// 給 AI 的指示（下面的 SYSTEM）改版時往上加：版本號算進快取指紋，
// 舊指示產生的建議句會在下次有人打開時自動重新產生。
const PROMPT_VERSION = 3

/** 材料的指紋，存進快取用來判斷筆記內容（或給 AI 的指示）有沒有改過。 */
export function hashSource(source: string): string {
  return createHash('sha256').update(`v${PROMPT_VERSION}\n${source}`).digest('hex').slice(0, 16)
}

const SYSTEM: Record<'zh' | 'en', string> = {
  zh: `你是一個聖經讀經 app 的寫作陪伴者，服務對象是青少年。

任務：根據今天筆記的「經文分析」和「問題反思」，寫一句「下筆的引導」，放在使用者的心得輸入框裡當提示，引導他留言可以往哪個方向寫。

規則：
- 只寫一句。
- 從筆記裡的一個重點接著往下說，帶出可以延伸的方向，讓使用者順著這句話繼續寫下去。
- 句尾留白讓人接著寫，用「…」結尾，例如「守門的人除了擋住危險，也會鼓勵膽怯的人，這讓人想到身邊…」。
- 扣住今天筆記裡的一個具體畫面或提問，不要寫成放諸四海皆準的空話。
- 口語、自然，不要說教、不要講道、不要用艱深的神學詞彙。
- 長度 15 到 40 個字，寧可短一點；短句比較好接著寫。
- 不要用「不只是…更是…」「不是…而是…」這類句型，讀起來像作文範本。
- 使用繁體中文。

輸出：只輸出那一句話本身，不要加引號、編號或任何說明。`,
  en: `You are a writing companion in a Bible-reading app for teenagers.

Task: based on today's "Passage Analysis" and "Reflection Question", write a short writing nudge. It appears as a hint inside the user's reflection box to guide which direction their reflection could take.

Rules:
- Exactly one sentence.
- Pick up one key point from the note and carry it forward into a direction they can keep writing about, so they can continue right from this sentence.
- Leave it open, ending with "…", e.g. "The gatekeepers guarded against danger and also encouraged the timid, which brings to mind…".
- Tie it to one concrete image or question from today's note, not a generic line that fits any day.
- Casual and natural. No preaching, no heavy theological vocabulary.
- 8 to 24 words.

Output: only the sentence itself, with no quotes, numbering, or explanation.`,
}

// 模型偶爾還是會多話：包引號、前面加「心得開頭：」、給兩行。只留第一行、去掉外層標點。
function cleanPrompt(text: string): string | null {
  const firstLine = text.split('\n').map(s => s.trim()).find(Boolean)
  if (!firstLine) return null
  const cleaned = firstLine
    .replace(/^(心得開頭|開頭|提示|Opening|Hint)\s*[:：]\s*/i, '')
    .replace(/^["'「『“‘]+|["'」』”’]+$/g, '')
    .trim()
  // 長度上限只防模型失控回一大段；設太緊會把正常的英文句子切在半個字上
  if (!cleaned || cleaned.length > 200) return null
  return cleaned
}

/**
 * 呼叫 AI 產生一句心得開頭。previous 是使用者今天已經看過的建議，請模型換個角度別重複。
 * 回 null 代表 OpenAI 和 Gemini 都沒回出可用的句子。
 */
export async function generateReflectionPrompt(
  source: string, lang: 'zh' | 'en', previous: string[] = []
): Promise<{ prompt: string; model: string } | null> {
  const avoid = previous.length
    ? lang === 'zh'
      ? `\n\n使用者已經看過下面這些開頭，請換一個角度，不要重複或只是換句話說：\n${previous.map(p => `- ${p}`).join('\n')}`
      : `\n\nThe user has already seen these openings. Take a different angle; don't repeat or merely rephrase them:\n${previous.map(p => `- ${p}`).join('\n')}`
    : ''
  const userPrompt = (lang === 'zh' ? '今天的筆記內容：\n\n' : "Today's note:\n\n") + source + avoid

  const result = await generateText(SYSTEM[lang], userPrompt)
  if (!result) return null
  const prompt = cleanPrompt(result.text)
  return prompt ? { prompt, model: result.model } : null
}
