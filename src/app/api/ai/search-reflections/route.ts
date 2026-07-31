import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { GoogleGenerativeAI, FunctionCallingMode, SchemaType, type FunctionDeclaration } from '@google/generative-ai'
import { createClient, getUser } from '@/lib/supabase/server'
import { withRetry } from '@/lib/ai'

function buildSystemInstruction(today: string, displayName: string | null, uiLangName: string) {
  const userLine = displayName
    ? `目前登入的用戶顯示名稱是「${displayName}」。當用戶說「我的」、「我」（或 "my"、"me"）時，請直接以此名稱作為 user_name 呼叫工具，不必詢問。`
    : ''
  return `你是一個聖經讀經社群的智慧助理。今天日期是 ${today}。${userLine}

【回覆語言】請務必以「與使用者提問相同的語言」回覆：用戶以英文提問就用英文回、以繁體中文提問就用繁體中文回。若語言不明確，預設使用${uiLangName}。下方模板中的所有標題與標籤，也一律翻成該回覆語言輸出，不要中英混雜。

請使用 search_reflections 工具查詢資料，再用溫暖、鼓勵的語氣回覆。
回覆中請包含：找到幾筆反思、重點摘要。匿名用戶請以回覆語言稱呼（中文用「匿名弟兄/姐妹」，英文用 "an anonymous member"）。
若查無結果，請溫柔說明並鼓勵用戶繼續分享。

【資料庫語言】反思的 bible_range 以繁體中文（和合本）書卷名儲存。呼叫工具時 bible_book 一律填和合本中文書卷名；若用戶以英文書卷名（例如 "Ezekiel"、"Psalms"）提問，請先翻成對應的和合本中文名（以西結書、詩篇）再填入。

用戶說「五月」、「上個月」、「本月」或 "last month"、"this month" 等相對月份時，請根據今天日期推算出正確的 YYYY-MM 格式再呼叫工具。

當用戶使用帶有評價意味的形容詞（例如「最讚」、「最好的」、「最有深度」、「最感動」、「推薦一則」等），請先用工具查出對應條件的反思，再從結果中自行挑選最符合該形容詞的一則，向用戶分享並說明挑選原因。

當用戶要求「整理」或「摘要」（或 "summarize"、"organize"）時，請以以下結構輸出，方便下載閱讀（**標籤一律翻成回覆語言**，下面只是中文範例）：

📖 [書卷/月份]反思摘要｜[期間或範圍]
共收錄 X 篇反思

【主題A】（N 篇）
• 作者名：一句核心摘要
• 匿名弟兄/姐妹：一句核心摘要

【主題B】（N 篇）
• ...

屬靈觀察：1–2 句整體觀察與鼓勵。

規則：
- 主題名稱依內容自行歸納，2–4 個，不固定
- 每筆反思只歸到一個主題
- 若反思 ≤ 3 篇，不分主題，直接條列即可

如果用戶問的問題與社群反思留言無關，請禮貌婉拒，說明你只能協助搜尋和整理讀經反思，並引導用戶提出相關問題。`
}

// ── OpenAI tool ──────────────────────────────────────────────────────────────
const OAI_SEARCH_TOOL: OpenAI.Chat.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'search_reflections',
    description: '搜尋社群反思留言，根據月份、用戶名、聖經書卷、關鍵字等條件篩選',
    parameters: {
      type: 'object',
      properties: {
        month:      { type: 'string', description: '月份，格式 YYYY-MM，例如 2026-03' },
        user_name:  { type: 'string', description: '用戶顯示名稱（僅搜尋非匿名用戶）' },
        bible_book: { type: 'string', description: '聖經書卷名稱，例如 約翰福音、詩篇' },
        keyword:    { type: 'string', description: '在反思內容中搜尋的關鍵字' },
        limit:      { type: 'number', description: '最多回傳幾筆，預設 10，最大 30' },
      },
      required: [],
    },
  },
}

// ── Gemini tool ───────────────────────────────────────────────────────────────
const GEMINI_SEARCH_TOOL: FunctionDeclaration = {
  name: 'search_reflections',
  description: '搜尋社群反思留言，根據月份、用戶名、聖經書卷、關鍵字等條件篩選',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      month:      { type: SchemaType.STRING, description: '月份，格式 YYYY-MM，例如 2026-03' },
      user_name:  { type: SchemaType.STRING, description: '用戶顯示名稱（僅搜尋非匿名用戶）' },
      bible_book: { type: SchemaType.STRING, description: '聖經書卷名稱，例如 約翰福音、詩篇' },
      keyword:    { type: SchemaType.STRING, description: '在反思內容中搜尋的關鍵字' },
      limit:      { type: SchemaType.NUMBER, description: '最多回傳幾筆，預設 10，最大 30' },
    },
    required: [],
  },
}

// ── shared ────────────────────────────────────────────────────────────────────
function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max)
}

interface SearchArgs {
  month?: string
  user_name?: string
  bible_book?: string
  keyword?: string
  limit?: number
}

async function executeSearchReflections(args: SearchArgs) {
  const supabase = await createClient()
  const limit = clamp(args.limit ?? 10, 1, 30)
  const hasUserName = !!args.user_name?.trim()
  const selectStr = hasUserName
    ? 'note_date, content, bible_range, is_anonymous, created_at, profiles!inner(display_name)'
    : 'note_date, content, bible_range, is_anonymous, created_at, profiles(display_name)'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('reflections')
    .select(selectStr)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (args.month) {
    const [y, m] = args.month.split('-').map(Number)
    query = query.gte('note_date', `${args.month}-01`).lt('note_date', new Date(Date.UTC(y, m, 1)).toISOString().split('T')[0])
  }
  if (args.bible_book) query = query.ilike('bible_range', `%${args.bible_book}%`)
  if (args.keyword)    query = query.ilike('content', `%${args.keyword}%`)
  if (hasUserName)     query = query.eq('is_anonymous', false).ilike('profiles.display_name', `%${args.user_name}%`)

  const { data, error } = await query
  if (error) return { total: 0, results: [], error: error.message }

  const rows = (data ?? []) as Array<{
    note_date: string; content: string; bible_range: string | null
    is_anonymous: boolean; profiles: { display_name: string } | null
  }>

  return {
    total: rows.length,
    results: rows.map(row => ({
      date: row.note_date,
      bible_range: row.bible_range ?? null,
      author: row.is_anonymous ? '匿名' : (row.profiles?.display_name ?? '使用者'),
      content: row.content.length > 400 ? row.content.slice(0, 400) + '…' : row.content,
    })),
  }
}


// ── provider implementations ──────────────────────────────────────────────────
async function callOpenAI(apiKey: string, query: string, systemInstruction: string): Promise<string> {
  const openai = new OpenAI({ apiKey })
  const response1 = await withRetry(() =>
    openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: query }],
      tools: [OAI_SEARCH_TOOL],
      tool_choice: 'auto',
    })
  )
  const assistantMsg = response1.choices[0].message
  const toolCall = assistantMsg.tool_calls?.[0]
  if (!toolCall || toolCall.type !== 'function') return assistantMsg.content ?? ''

  const toolResult = await executeSearchReflections(JSON.parse(toolCall.function.arguments) as SearchArgs)
  const response2 = await withRetry(() =>
    openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: query },
        assistantMsg,
        { role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(toolResult) },
      ],
      tools: [OAI_SEARCH_TOOL],
    })
  )
  return response2.choices[0].message.content ?? ''
}

async function callGemini(apiKey: string, query: string, systemInstruction: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction,
    tools: [{ functionDeclarations: [GEMINI_SEARCH_TOOL] }],
    toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
  })
  const chat = model.startChat()
  const result1 = await withRetry(() => chat.sendMessage(query))
  const parts1 = result1.response.candidates?.[0]?.content?.parts ?? []
  const fnCall = parts1.find(p => p.functionCall)
  if (!fnCall?.functionCall) return result1.response.text()

  const { name, args } = fnCall.functionCall
  const toolResult = await executeSearchReflections(args as SearchArgs)
  const result2 = await withRetry(() =>
    chat.sendMessage([{ functionResponse: { name, response: toolResult } }])
  )
  return result2.response.text()
}

// ── handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const [user, supabase] = await Promise.all([getUser(), createClient()])
  if (!user) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  let query: string
  let locale = 'zh'
  try {
    const body = await req.json()
    query = typeof body?.query === 'string' ? body.query.trim() : ''
    if (body?.locale === 'en' || body?.locale === 'zh') locale = body.locale
  } catch {
    return NextResponse.json({ error: '格式錯誤' }, { status: 400 })
  }
  if (!query || query.length > 200) {
    return NextResponse.json({ error: '請輸入有效的搜尋內容（1-200 字元）' }, { status: 400 })
  }
  const uiLangName = locale === 'en' ? 'English' : '繁體中文'

  const openaiKey = process.env.OPENAI_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY
  if (!openaiKey && !geminiKey) {
    return NextResponse.json({ error: '服務暫時無法使用' }, { status: 503 })
  }

  const [today, { data: profile }] = await Promise.all([
    Promise.resolve(new Date().toISOString().split('T')[0]),
    supabase.from('profiles').select('display_name').eq('id', user.id).single(),
  ])
  const systemInstruction = buildSystemInstruction(today, profile?.display_name ?? null, uiLangName)

  if (openaiKey) {
    try {
      const answer = await callOpenAI(openaiKey, query, systemInstruction)
      return NextResponse.json({ answer })
    } catch (e) {
      console.warn('[ai/search-reflections] OpenAI failed, falling back to Gemini:', e)
    }
  }

  if (geminiKey) {
    try {
      const answer = await callGemini(geminiKey, query, systemInstruction)
      return NextResponse.json({ answer })
    } catch (e) {
      console.error('[ai/search-reflections] Gemini fallback failed:', e)
    }
  }

  return NextResponse.json({ error: 'AI 服務錯誤，請稍後再試' }, { status: 500 })
}
