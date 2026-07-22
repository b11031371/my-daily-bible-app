import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { GoogleGenerativeAI, FunctionCallingMode, SchemaType, type FunctionDeclaration } from '@google/generative-ai'
import { createClient, getUser } from '@/lib/supabase/server'
import { fetchMarkdown, fetchPassageRange } from '@/lib/github/api'
import { isLocale, noteLangFor, DEFAULT_LOCALE, type Locale } from '@/lib/i18n'
import { QUIZ_CONFIG, parseQuestionDrafts } from '@/lib/quiz'
import { getQuizAccess } from '@/lib/quiz-access'
import { todayString } from '@/lib/utils'

// 骨架比照 src/app/api/ai/parse-filter/route.ts：OpenAI function calling 為主，
// 失敗才降級到 Gemini。差別在這裡要的是一整包題目，不是幾個篩選欄位。

const QUESTION_SCHEMA_DESC = {
  prompt: '題幹，一句話問完，不要出現選項內容',
  options: '四個選項的文字，只有一個是正確的，長度要相近',
  correct_index: '正確選項在 options 陣列中的位置（0 到 3）',
  explanation: '一句話解析，附上經節出處',
}

const OAI_TOOL: OpenAI.Chat.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'create_questions',
    description: '產生一組聖經測驗選擇題',
    parameters: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              prompt:        { type: 'string',  description: QUESTION_SCHEMA_DESC.prompt },
              options:       { type: 'array', items: { type: 'string' }, description: QUESTION_SCHEMA_DESC.options },
              correct_index: { type: 'integer', description: QUESTION_SCHEMA_DESC.correct_index },
              explanation:   { type: 'string',  description: QUESTION_SCHEMA_DESC.explanation },
            },
            required: ['prompt', 'options', 'correct_index', 'explanation'],
          },
        },
      },
      required: ['questions'],
    },
  },
}

const GEMINI_TOOL: FunctionDeclaration = {
  name: 'create_questions',
  description: '產生一組聖經測驗選擇題',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      questions: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            prompt:        { type: SchemaType.STRING,  description: QUESTION_SCHEMA_DESC.prompt },
            options:       { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: QUESTION_SCHEMA_DESC.options },
            correct_index: { type: SchemaType.INTEGER, description: QUESTION_SCHEMA_DESC.correct_index },
            explanation:   { type: SchemaType.STRING,  description: QUESTION_SCHEMA_DESC.explanation },
          },
          required: ['prompt', 'options', 'correct_index', 'explanation'],
        },
      },
    },
    required: ['questions'],
  },
}

const DIFFICULTY_HINT: Record<string, string> = {
  easy:   '題目要好答，考經文表面就讀得到的人事時地物。',
  normal: '一半考細節、一半考因果與人物動機。',
  hard:   '可以考前後文關聯、比喻的意思、以及容易記混的細節，但答案仍必須在指定範圍內找得到。',
}

const LANGUAGE_HINT: Record<Locale, string> = {
  zh: '所有題目、選項與解析都用繁體中文，聖經專有名詞用和合本譯名。',
  en: 'Write every question, option and explanation in English, using KJV/NKJV proper names.',
}

function buildPrompt(opts: {
  locale: Locale
  count: number
  difficulty: string
  bibleRange: string
  noteText: string | null
}) {
  const { locale, count, difficulty, bibleRange, noteText } = opts
  const system = `你是一位帶青少年查經的老師，正在出一份現場搶答用的選擇題。
${LANGUAGE_HINT[locale] ?? LANGUAGE_HINT.zh}
規則：
- 出 ${count} 題，每題四個選項，只有一個正確答案。
- ${DIFFICULTY_HINT[difficulty] ?? DIFFICULTY_HINT.normal}
- 只考「${bibleRange}」這個範圍內讀得到的內容，不要考範圍外的冷知識或宗派觀點。
- 每一題的正確答案都必須能在這段經文裡直接指出是哪一節。做不到就換一題。
- 不要問經文沒有明說的事：人物的動機、心理、目的、後續發展，以及「為什麼」開頭而經文沒有給理由的問題，一律不出。
- 不要把別卷書的內容混進來（例如同一個比喻在其他福音書的細節）。
- 四個錯誤選項要合理（同一個範圍內的人名、地名、數字），不要出現明顯湊數的荒謬選項。
- 選項長度盡量相近，正確答案不要總是最長的那一個。
- 用詞貼近青少年，避免文言與艱澀神學術語。
- 題幹不要出現「以下何者」以外的提示，也不要在題幹裡先講出答案。
- explanation 必須寫出具體經節（例如「可 4:8」），不確定是哪一節就不要出那一題。
只呼叫 create_questions 工具，不要輸出其他文字。`

  const user = noteText
    ? `經文範圍：${bibleRange}\n\n以下是這段經文的讀經筆記，請以它為主要素材出題：\n\n${noteText}`
    : `經文範圍：${bibleRange}`

  return { system, user }
}

interface RawQuestions { questions?: unknown }

async function callOpenAI(apiKey: string, system: string, user: string): Promise<unknown> {
  const openai = new OpenAI({ apiKey })
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    tools: [OAI_TOOL],
    tool_choice: { type: 'function', function: { name: 'create_questions' } },
  })
  const toolCall = response.choices[0].message.tool_calls?.[0]
  if (!toolCall || toolCall.type !== 'function') return null
  return (JSON.parse(toolCall.function.arguments) as RawQuestions).questions
}

async function callGemini(apiKey: string, system: string, user: string): Promise<unknown> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: system,
    tools: [{ functionDeclarations: [GEMINI_TOOL] }],
    toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.ANY } },
  })
  const result = await model.generateContent(user)
  const parts = result.response.candidates?.[0]?.content?.parts ?? []
  const fnCall = parts.find(p => p.functionCall)
  if (!fnCall?.functionCall) return null
  return (fnCall.functionCall.args as RawQuestions).questions
}

export async function POST(req: NextRequest) {
  const [user, supabase] = await Promise.all([getUser(), createClient()])
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const count = Math.min(Math.max(Math.trunc(Number(body?.count) || 5), 1), QUIZ_CONFIG.aiMaxCount)
  const difficulty = typeof body?.difficulty === 'string' ? body.difficulty : 'normal'
  const noteDate = typeof body?.note_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.note_date)
    ? body.note_date
    : null
  let bibleRange = typeof body?.bible_range === 'string' ? body.bible_range.trim() : ''

  const [{ data: profile }, { canUseQuiz, canUseAi, isAdmin }] = await Promise.all([
    supabase.from('profiles').select('language').eq('id', user.id).single(),
    getQuizAccess(supabase, user.id),
  ])

  if (!canUseQuiz) {
    return NextResponse.json({ error: '功能尚未開放', code: 'quiz_closed' }, { status: 403 })
  }
  if (!canUseAi) {
    return NextResponse.json({ error: 'AI 出題目前沒有開放', code: 'ai_closed' }, { status: 403 })
  }

  // 每人每天的次數上限，admin 不受限
  if (!isAdmin) {
    const { count: usedToday } = await supabase
      .from('quizzes')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .eq('origin', 'ai')
      .gte('created_at', `${todayString()}T00:00:00+08:00`)
    if ((usedToday ?? 0) >= QUIZ_CONFIG.aiDailyLimit) {
      return NextResponse.json(
        { error: `今天的 AI 出題次數用完了（每天 ${QUIZ_CONFIG.aiDailyLimit} 次）`, code: 'daily_limit' },
        { status: 429 }
      )
    }
  }

  const locale: Locale = isLocale(profile?.language) ? profile.language : DEFAULT_LOCALE

  // 選了日期就把那天的筆記當素材，出題才不會憑印象亂編
  let noteText: string | null = null
  if (noteDate) {
    const [md, range] = await Promise.all([
      fetchMarkdown(noteDate, noteLangFor(locale)),
      fetchPassageRange(noteDate, noteLangFor(locale)),
    ])
    noteText = md ? md.slice(0, 6000) : null
    if (!bibleRange && range) bibleRange = range
  }
  if (!bibleRange) {
    return NextResponse.json({ error: '請輸入經文範圍', code: 'range_required' }, { status: 400 })
  }

  const { system, user: userPrompt } = buildPrompt({ locale, count, difficulty, bibleRange, noteText })

  const openaiKey = process.env.OPENAI_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY
  if (!openaiKey && !geminiKey) {
    return NextResponse.json({ error: '服務暫時無法使用' }, { status: 503 })
  }

  let raw: unknown = null
  if (openaiKey) {
    try {
      raw = await callOpenAI(openaiKey, system, userPrompt)
    } catch (e) {
      console.warn('[quiz/generate] OpenAI failed, falling back to Gemini:', e)
    }
  }
  if (!raw && geminiKey) {
    try {
      raw = await callGemini(geminiKey, system, userPrompt)
    } catch (e) {
      console.error('[quiz/generate] Gemini fallback failed:', e)
    }
  }

  // AI 回來的東西照樣走一次驗證，不信任它有乖乖照 schema 填
  const parsed = parseQuestionDrafts(raw)
  if (!parsed.ok) {
    console.error('[quiz/generate] unusable output:', parsed.error)
    return NextResponse.json({ error: '出題失敗，請再試一次', code: 'generate_failed' }, { status: 500 })
  }

  const title = typeof body?.title === 'string' && body.title.trim()
    ? body.title.trim().slice(0, 60)
    : bibleRange.slice(0, 60)

  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .insert({
      owner_id: user.id,
      title,
      bible_range: bibleRange,
      source_note_date: noteDate,
      origin: 'ai',
      language: locale,
    })
    .select('id')
    .single()
  if (quizError || !quiz) return NextResponse.json({ error: '建立失敗' }, { status: 500 })

  const { error: insError } = await supabase.from('quiz_questions').insert(
    parsed.questions.map((q, i) => ({
      quiz_id: quiz.id,
      order_index: i,
      prompt: q.prompt,
      options: q.options,
      correct_index: q.correct_index,
      explanation: q.explanation,
      time_limit_seconds: q.time_limit_seconds,
    }))
  )
  if (insError) {
    await supabase.from('quizzes').delete().eq('id', quiz.id)
    return NextResponse.json({ error: '建立失敗' }, { status: 500 })
  }

  return NextResponse.json({ id: quiz.id, count: parsed.questions.length })
}
