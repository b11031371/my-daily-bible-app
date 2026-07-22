import type { QuizQuestionDraft } from '@/types/app'

// 測驗（Kahoot 風即時搶答）的共用設定與計分。
// 計分公式與 supabase/migrations/018_quiz.sql 的 fn_submit_quiz_answer 互為鏡像，
// 改一邊記得改另一邊（跟 points.ts / fn_checkin 同樣的慣例）。

export const QUIZ_CONFIG = {
  basePoints: 1000,
  /** 答對最慢也拿得到 basePoints * (1 - speedWeight) */
  speedWeight: 0.5,
  maxQuestions: 20,
  minOptions: 2,
  maxOptions: 4,
  timeLimitOptions: [10, 15, 20, 30, 45, 60] as const,
  defaultTimeLimit: 20,
  pinLength: 6,
  maxNicknameLength: 12,
  /** AI 出題單次題數上限 */
  aiMaxCount: 10,
  /** AI 出題每人每天上限（次數，非題數） */
  aiDailyLimit: 5,
} as const

/** 只用數字，現場念 PIN 給人聽最不會出錯 */
export function generatePin(): string {
  return Array.from({ length: QUIZ_CONFIG.pinLength }, () =>
    Math.floor(Math.random() * 10)
  ).join('')
}

export function generatePlayerToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

/** 答錯 0 分；答對依作答速度線性遞減 */
export function calcPoints(correct: boolean, elapsedMs: number, timeLimitSeconds: number): number {
  if (!correct) return 0
  const ratio = Math.min(Math.max(elapsedMs, 0) / (timeLimitSeconds * 1000), 1)
  return Math.round(QUIZ_CONFIG.basePoints * (1 - QUIZ_CONFIG.speedWeight * ratio))
}

/** 四色塊：顏色 + 形狀雙重編碼，色盲也分得出來 */
export const ANSWER_STYLES = [
  { bg: 'bg-[#E2445C]', shape: 'triangle' },
  { bg: 'bg-[#2D7FF9]', shape: 'diamond' },
  { bg: 'bg-[#E8A33D]', shape: 'circle' },
  { bg: 'bg-[#3FAF6C]', shape: 'square' },
] as const

export const AVATAR_SEEDS = [
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta',
  'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu',
] as const

export function randomAvatarSeed(): string {
  return AVATAR_SEEDS[Math.floor(Math.random() * AVATAR_SEEDS.length)]
}

export function emptyQuestion(): QuizQuestionDraft {
  return {
    prompt: '',
    options: ['', '', '', ''],
    correct_index: 0,
    explanation: null,
    time_limit_seconds: QUIZ_CONFIG.defaultTimeLimit,
  }
}

/**
 * 把來路不明的 JSON 收斂成乾淨的題目陣列。API route 與 AI 出題都走這裡，
 * 免得髒資料撞上 DB 的 CHECK 約束才爆掉（那時只會拿到看不懂的錯誤訊息）。
 */
export function parseQuestionDrafts(input: unknown): { ok: true; questions: QuizQuestionDraft[] } | { ok: false; error: string } {
  if (!Array.isArray(input)) return { ok: false, error: 'invalid_questions' }
  if (input.length === 0) return { ok: false, error: 'no_questions' }
  if (input.length > QUIZ_CONFIG.maxQuestions) return { ok: false, error: 'too_many_questions' }

  const questions: QuizQuestionDraft[] = []
  for (const raw of input) {
    if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'invalid_questions' }
    const q = raw as Record<string, unknown>

    const prompt = typeof q.prompt === 'string' ? q.prompt.trim() : ''
    if (!prompt) return { ok: false, error: 'empty_prompt' }

    const options = Array.isArray(q.options)
      ? q.options.map(o => (typeof o === 'string' ? o.trim() : '')).filter(Boolean)
      : []
    if (options.length < QUIZ_CONFIG.minOptions) return { ok: false, error: 'too_few_options' }
    if (options.length > QUIZ_CONFIG.maxOptions) return { ok: false, error: 'too_many_options' }

    const correct = typeof q.correct_index === 'number' ? Math.trunc(q.correct_index) : -1
    if (correct < 0 || correct >= options.length) return { ok: false, error: 'invalid_correct_index' }

    const limit = typeof q.time_limit_seconds === 'number' ? Math.trunc(q.time_limit_seconds) : QUIZ_CONFIG.defaultTimeLimit
    if (limit < 5 || limit > 120) return { ok: false, error: 'invalid_time_limit' }

    const explanation = typeof q.explanation === 'string' && q.explanation.trim() ? q.explanation.trim() : null

    questions.push({ prompt, options, correct_index: correct, explanation, time_limit_seconds: limit })
  }
  return { ok: true, questions }
}
