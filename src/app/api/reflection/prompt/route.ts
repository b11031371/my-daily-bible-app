import { NextRequest, NextResponse } from 'next/server'
import { createClient, getUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchMarkdown } from '@/lib/github/api'
import { todayString } from '@/lib/utils'
import {
  PROMPT_SWAP_LIMIT,
  extractPromptSource,
  generateReflectionPrompt,
  hashSource,
  type ReflectionPromptResponse,
} from '@/lib/reflection-prompt'

// 心得框的 AI 下筆建議。
//   GET  ?date=YYYY-MM-DD&lang=zh|en  這個人換過的句子（沒有就給全站共用的第一句）＋今天剩幾次，不扣次數
//   POST { date, lang, previous }     「換一個」：扣一次、即時產生一句，只給這個人，並記下來

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
type Lang = 'zh' | 'en'

function parseLang(value: unknown): Lang | null {
  return value === 'zh' || value === 'en' ? value : null
}

/**
 * 登入檢查＋筆記可見性。審核模式下沒通過的筆記，筆記頁本身就是 404，
 * 這裡也不能替它產生建議（建議句會洩漏筆記內容）。admin 例外。
 */
async function authorize(date: string): Promise<{ userId: string; isAdmin: boolean } | NextResponse> {
  const [user, supabase] = await Promise.all([getUser(), createClient()])
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [{ data: profile }, { data: approval }, { data: setting }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    sb.from('note_approvals').select('date').eq('date', date).maybeSingle(),
    sb.from('app_settings').select('value').eq('key', 'approval_mode').single(),
  ])
  const isAdmin = profile?.role === 'admin'
  if (setting?.value === 'true' && !isAdmin && !approval) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return { userId: user.id, isAdmin }
}

async function loadSource(date: string, lang: Lang): Promise<string | null> {
  const markdown = await fetchMarkdown(date, lang)
  return markdown ? extractPromptSource(markdown, lang) : null
}

type Admin = ReturnType<typeof createAdminClient>

async function readSwapCount(admin: Admin, userId: string, usageDate: string): Promise<number> {
  const { data } = await admin
    .from('reflection_prompt_usage')
    .select('swap_count')
    .eq('user_id', userId)
    .eq('usage_date', usageDate)
    .maybeSingle()
  return data?.swap_count ?? 0
}

async function readPick(admin: Admin, userId: string, date: string, lang: Lang): Promise<string | null> {
  const { data } = await admin
    .from('reflection_prompt_picks')
    .select('prompt')
    .eq('user_id', userId)
    .eq('note_date', date)
    .eq('lang', lang)
    .maybeSingle()
  return data?.prompt ?? null
}

/** 記下這個人在這份筆記、這個語言最後換到的句子，重新整理或回來時 GET 會優先給它。 */
async function savePick(admin: Admin, userId: string, date: string, lang: Lang, prompt: string) {
  const { error } = await admin.from('reflection_prompt_picks').upsert({
    user_id: userId,
    note_date: date,
    lang,
    prompt,
    updated_at: new Date().toISOString(),
  })
  return !error
}

function quota(isAdmin: boolean, used: number): Pick<ReflectionPromptResponse, 'remaining' | 'limit' | 'unlimited'> {
  return isAdmin
    ? { remaining: PROMPT_SWAP_LIMIT, limit: PROMPT_SWAP_LIMIT, unlimited: true }
    : { remaining: Math.max(0, PROMPT_SWAP_LIMIT - used), limit: PROMPT_SWAP_LIMIT }
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') ?? ''
  const lang = parseLang(req.nextUrl.searchParams.get('lang'))
  if (!DATE_RE.test(date) || !lang) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const auth = await authorize(date)
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const [pick, used] = await Promise.all([
    readPick(admin, auth.userId, date, lang),
    readSwapCount(admin, auth.userId, todayString()),
  ])
  // 換過就給換到的那句，不必讀筆記、也不必碰共用快取
  if (pick) return NextResponse.json<ReflectionPromptResponse>({ prompt: pick, ...quota(auth.isAdmin, used) })

  const source = await loadSource(date, lang)
  if (!source) return NextResponse.json<ReflectionPromptResponse>({ prompt: null, ...quota(auth.isAdmin, used) })

  const sourceHash = hashSource(source)
  const { data: cached } = await admin
    .from('reflection_prompt_cache')
    .select('prompt, source_hash')
    .eq('note_date', date)
    .eq('lang', lang)
    .maybeSingle()
  if (cached && cached.source_hash === sourceHash) {
    return NextResponse.json<ReflectionPromptResponse>({ prompt: cached.prompt, ...quota(auth.isAdmin, used) })
  }

  // 快取沒有，或筆記改版了：產生一次寫回去，之後打開這份筆記的人都直接用。
  // 兩個人同時打開都沒命中時會各產一次，後寫的蓋掉先寫的，無妨。
  const result = await generateReflectionPrompt(source, lang)
  if (!result) return NextResponse.json<ReflectionPromptResponse>({ prompt: null, ...quota(auth.isAdmin, used) })

  await admin.from('reflection_prompt_cache').upsert({
    note_date: date,
    lang,
    prompt: result.prompt,
    source_hash: sourceHash,
    model: result.model,
    created_at: new Date().toISOString(),
  })
  return NextResponse.json<ReflectionPromptResponse>({ prompt: result.prompt, ...quota(auth.isAdmin, used) })
}

export async function POST(req: NextRequest) {
  let date = ''
  let lang: Lang | null = null
  let previous: string[] = []
  try {
    const body = await req.json()
    date = typeof body?.date === 'string' ? body.date : ''
    lang = parseLang(body?.lang)
    // 前端傳來的「已看過的建議」，只拿來提醒模型別重複；限制數量和長度，免得被灌爆 prompt
    previous = Array.isArray(body?.previous)
      ? body.previous.filter((p: unknown): p is string => typeof p === 'string').slice(-6).map((p: string) => p.slice(0, 200))
      : []
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  if (!DATE_RE.test(date) || !lang) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const auth = await authorize(date)
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const usageDate = todayString()
  const source = await loadSource(date, lang)
  if (!source) {
    const used = await readSwapCount(admin, auth.userId, usageDate)
    return NextResponse.json<ReflectionPromptResponse>({ prompt: null, ...quota(auth.isAdmin, used) })
  }

  // admin 不扣次數，直接產生
  if (auth.isAdmin) {
    const result = await generateReflectionPrompt(source, lang, previous)
    if (result && !(await savePick(admin, auth.userId, date, lang, result.prompt))) {
      return NextResponse.json({ error: 'Could not save prompt' }, { status: 503 })
    }
    return NextResponse.json<ReflectionPromptResponse>({ prompt: result?.prompt ?? null, ...quota(true, 0) })
  }

  // DB RPC 在交易中原子認領次數，並為這次請求建立可獨立退款的 claim。
  const claimId = crypto.randomUUID()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: claimedCount, error: claimError } = await (admin as any).rpc('claim_reflection_prompt_swap', {
    p_user_id: auth.userId,
    p_usage_date: usageDate,
    p_claim_id: claimId,
  })
  if (claimError) {
    const used = await readSwapCount(admin, auth.userId, usageDate)
    return NextResponse.json<ReflectionPromptResponse>({ prompt: null, ...quota(false, used) }, { status: 503 })
  }
  if (claimedCount === null) {
    const used = await readSwapCount(admin, auth.userId, usageDate)
    return NextResponse.json<ReflectionPromptResponse>({ prompt: null, ...quota(false, used) }, { status: 429 })
  }

  const result = await generateReflectionPrompt(source, lang, previous)
  if (!result) {
    // AI 兩家都掛了，使用者什麼都沒拿到，把剛扣的那次退回去。
    // 同樣用條件更新：這段期間如果又扣了一次（另一個分頁），就不退，免得把對方那次也吃掉。
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: refunded } = await (admin as any).rpc('refund_reflection_prompt_swap', { p_claim_id: claimId })
    const used = await readSwapCount(admin, auth.userId, usageDate)
    return NextResponse.json<ReflectionPromptResponse>({ prompt: null, ...quota(false, used) }, { status: refunded ? 200 : 503 })
  }

  if (!(await savePick(admin, auth.userId, date, lang, result.prompt))) {
    // 生成成功但無法保存時，退款只會撤銷本次 claim，不影響其他分頁已使用的額度。
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).rpc('refund_reflection_prompt_swap', { p_claim_id: claimId })
    const used = await readSwapCount(admin, auth.userId, usageDate)
    return NextResponse.json<ReflectionPromptResponse>({ prompt: null, ...quota(false, used) }, { status: 503 })
  }
  return NextResponse.json<ReflectionPromptResponse>({ prompt: result.prompt, ...quota(false, claimedCount) })
}
