import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { GoogleGenerativeAI, FunctionCallingMode, SchemaType, type FunctionDeclaration } from '@google/generative-ai'
import { createClient, getUser } from '@/lib/supabase/server'
import type { ReflectionFilters } from '@/types/app'

// ── OpenAI tool ───────────────────────────────────────────────────────────────
const OAI_PARSE_TOOL: OpenAI.Chat.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'apply_filter',
    description: '根據用戶的自然語言查詢，提取篩選反思留言的條件',
    parameters: {
      type: 'object',
      properties: {
        month:      { type: 'string',  description: '月份，格式 YYYY-MM，例如 2026-05' },
        user_name:  { type: 'string',  description: '要查詢的其他用戶顯示名稱（非自己）' },
        self_only:  { type: 'boolean', description: '查詢目前登入用戶自己的留言（含匿名）' },
        bible_book: { type: 'string',  description: '聖經書卷名稱，例如 詩篇、哥林多前書' },
        keyword:    { type: 'string',  description: '在反思內容中搜尋的關鍵字' },
      },
      required: [],
    },
  },
}

// ── Gemini tool ───────────────────────────────────────────────────────────────
const GEMINI_PARSE_TOOL: FunctionDeclaration = {
  name: 'apply_filter',
  description: '根據用戶的自然語言查詢，提取篩選反思留言的條件',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      month:      { type: SchemaType.STRING,  description: '月份，格式 YYYY-MM，例如 2026-05' },
      user_name:  { type: SchemaType.STRING,  description: '要查詢的其他用戶顯示名稱（非自己）' },
      self_only:  { type: SchemaType.BOOLEAN, description: '查詢目前登入用戶自己的留言（含匿名）' },
      bible_book: { type: SchemaType.STRING,  description: '聖經書卷名稱，例如 詩篇、哥林多前書' },
      keyword:    { type: SchemaType.STRING,  description: '在反思內容中搜尋的關鍵字' },
    },
    required: [],
  },
}

function buildSystemInstruction(today: string, displayName: string | null) {
  return `你是一個篩選條件解析器。今天是 ${today}。${displayName ? `目前登入用戶的顯示名稱是「${displayName}」。` : ''}
根據用戶的自然語言查詢，呼叫 apply_filter 工具填入對應的篩選條件：
- 用戶說「我的」、「我」時，設定 self_only: true（不設定 user_name）
- 用戶說其他人的名稱時，設定 user_name
- 說「五月」、「上個月」等相對月份，請轉換為 YYYY-MM
- 說到書卷名稱，設定 bible_book
- 其他關鍵字設定 keyword
只呼叫工具，不輸出其他文字。`
}

interface ParsedArgs {
  month?: string
  user_name?: string
  self_only?: boolean
  bible_book?: string
  keyword?: string
}

function buildFilters(args: ParsedArgs): ReflectionFilters {
  const filters: ReflectionFilters = {}
  if (args.month)      filters.month      = args.month
  if (args.self_only)  filters.selfOnly   = true
  else if (args.user_name) filters.user_name = args.user_name
  if (args.bible_book) filters.bible_book = args.bible_book
  if (args.keyword)    filters.keyword    = args.keyword
  return filters
}

async function callOpenAI(apiKey: string, query: string, systemInstruction: string): Promise<ReflectionFilters> {
  const openai = new OpenAI({ apiKey })
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: query },
    ],
    tools: [OAI_PARSE_TOOL],
    tool_choice: { type: 'function', function: { name: 'apply_filter' } },
  })
  const toolCall = response.choices[0].message.tool_calls?.[0]
  if (!toolCall || toolCall.type !== 'function') return {}
  return buildFilters(JSON.parse(toolCall.function.arguments) as ParsedArgs)
}

async function callGemini(apiKey: string, query: string, systemInstruction: string): Promise<ReflectionFilters> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction,
    tools: [{ functionDeclarations: [GEMINI_PARSE_TOOL] }],
    toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.ANY } },
  })
  const result = await model.generateContent(query)
  const parts = result.response.candidates?.[0]?.content?.parts ?? []
  const fnCall = parts.find(p => p.functionCall)
  if (!fnCall?.functionCall) return {}
  return buildFilters(fnCall.functionCall.args as ParsedArgs)
}

export async function POST(req: NextRequest) {
  const [user, supabase] = await Promise.all([getUser(), createClient()])
  if (!user) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  let query: string
  try {
    const body = await req.json()
    query = typeof body?.query === 'string' ? body.query.trim() : ''
  } catch {
    return NextResponse.json({ error: '格式錯誤' }, { status: 400 })
  }
  if (!query) return NextResponse.json({ error: '請輸入查詢內容' }, { status: 400 })

  const openaiKey = process.env.OPENAI_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY
  if (!openaiKey && !geminiKey) {
    return NextResponse.json({ error: '服務暫時無法使用' }, { status: 503 })
  }

  const [today, { data: profile }] = await Promise.all([
    Promise.resolve(new Date().toISOString().split('T')[0]),
    supabase.from('profiles').select('display_name').eq('id', user.id).single(),
  ])
  const systemInstruction = buildSystemInstruction(today, profile?.display_name ?? null)

  if (openaiKey) {
    try {
      const filters = await callOpenAI(openaiKey, query, systemInstruction)
      return NextResponse.json({ filters })
    } catch (e) {
      console.warn('[ai/parse-filter] OpenAI failed, falling back to Gemini:', e)
    }
  }

  if (geminiKey) {
    try {
      const filters = await callGemini(geminiKey, query, systemInstruction)
      return NextResponse.json({ filters })
    } catch (e) {
      console.error('[ai/parse-filter] Gemini fallback failed:', e)
    }
  }

  return NextResponse.json({ error: 'AI 服務錯誤，請稍後再試' }, { status: 500 })
}
