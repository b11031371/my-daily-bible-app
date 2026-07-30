import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

/** 依書卷整理的反思摘要，一卷一項。API 與手冊頁面共用這個形狀。 */
export interface BookSummary {
  book: string
  summary: string
}

export const OPENAI_MODEL = 'gpt-4o-mini'
export const GEMINI_MODEL = 'gemini-2.5-flash'

/**
 * 過載與暫時性錯誤的退避重試。429/503 是「等一下再來」，其他錯誤直接拋——
 * 把 400 這種請求本身有問題的情況重試三次只是白等。
 */
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: unknown
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (e) {
      const status = (e as { status?: number })?.status
      if (status === 503 || status === 429) {
        lastError = e
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)))
        continue
      }
      throw e
    }
  }
  throw lastError
}

/**
 * 要一段純文字回應，OpenAI 為主、Gemini 為備援，都掛掉回 null。
 *
 * 沿用全站既有的供應商順序（見 api/ai/search-reflections）：OpenAI 先試，
 * 失敗就換 Gemini，兩邊都不通才放棄。呼叫端自己決定失敗要怎麼呈現。
 */
export async function generateText(systemInstruction: string, prompt: string): Promise<{ text: string; model: string } | null> {
  const openaiKey = process.env.OPENAI_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY

  if (openaiKey) {
    try {
      const openai = new OpenAI({ apiKey: openaiKey })
      const res = await withRetry(() =>
        openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt },
          ],
        })
      )
      const text = res.choices[0]?.message?.content
      if (text) return { text, model: OPENAI_MODEL }
    } catch (e) {
      console.warn('[ai] OpenAI failed, falling back to Gemini:', e)
    }
  }

  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey)
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL, systemInstruction })
      const res = await withRetry(() => model.generateContent(prompt))
      const text = res.response.text()
      if (text) return { text, model: GEMINI_MODEL }
    } catch (e) {
      console.error('[ai] Gemini fallback failed:', e)
    }
  }

  return null
}

/**
 * 從模型回應裡取出 JSON。
 *
 * 就算 prompt 說了「只回 JSON」，模型仍常在前後包一層 ```json 或加一句招呼。
 * 這裡切出第一個 [ 或 { 到最後一個 ] 或 }，比信任模型守規矩可靠。
 */
export function extractJson<T>(text: string): T | null {
  const start = text.search(/[[{]/)
  if (start === -1) return null
  const lastArray = text.lastIndexOf(']')
  const lastObject = text.lastIndexOf('}')
  const end = Math.max(lastArray, lastObject)
  if (end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1)) as T
  } catch {
    return null
  }
}
