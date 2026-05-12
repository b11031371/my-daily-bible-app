/**
 * 群組種樹整合測試
 * 執行：npx tsx scripts/test-groups.ts
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { getTreeStage, getFruitCount, TREE_CONFIG } from '../src/lib/tree'

// ─── Env ─────────────────────────────────────────────────────────────────────

function loadEnv(path: string): Record<string, string> {
  try {
    const result: Record<string, string> = {}
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      if (!line || line.startsWith('#') || !line.includes('=')) continue
      const idx = line.indexOf('=')
      result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
    }
    return result
  } catch { return {} }
}

const env = { ...loadEnv('.env.local'), ...loadEnv('.env.test.local') }

const SUPABASE_URL      = env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY          = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY       = env.SUPABASE_SERVICE_ROLE_KEY
const USER1_EMAIL       = env.TEST_USER1_EMAIL
const USER1_PASSWORD    = env.TEST_USER1_PASSWORD
const USER2_EMAIL       = env.TEST_USER2_EMAIL
const USER2_PASSWORD    = env.TEST_USER2_PASSWORD

for (const [k, v] of Object.entries({ SUPABASE_URL, ANON_KEY, SERVICE_KEY, USER1_EMAIL, USER1_PASSWORD, USER2_EMAIL, USER2_PASSWORD })) {
  if (!v) { console.error(`缺少環境變數：${k}`); process.exit(1) }
}

// ─── Clients ──────────────────────────────────────────────────────────────────

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function userClient() {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// ─── Assertion helpers ────────────────────────────────────────────────────────

let pass = 0, fail = 0

function check(ok: boolean, label: string, detail?: string) {
  if (ok) { console.log(`    ✅ ${label}`); pass++ }
  else    { console.log(`    ❌ ${label}${detail ? `  →  ${detail}` : ''}`); fail++ }
}

// ─── Tree points (same logic as community page) ───────────────────────────────

type CheckinRow = { user_id: string; note_date: string; points_earned: number }
type MemberRow  = { user_id: string; joined_at: string; left_at: string | null }

function calcTreePoints(checkins: CheckinRow[], members: MemberRow[], monthStart: string): number {
  const activeMemberIds = new Set(members.filter(m => m.left_at === null).map(m => m.user_id))
  return checkins
    .filter(c => c.note_date >= monthStart && activeMemberIds.has(c.user_id))
    .reduce((sum, c) => sum + c.points_earned, 0)
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function currentMonthDate(day: number): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function currentMonthStart(): string {
  return currentMonthDate(1)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 群組種樹整合測試\n')

  // Sign in both users
  const c1 = userClient()
  const { data: a1, error: e1 } = await c1.auth.signInWithPassword({ email: USER1_EMAIL, password: USER1_PASSWORD })
  if (e1 || !a1.user) { console.error('User1 登入失敗:', e1?.message); process.exit(1) }

  const c2 = userClient()
  const { data: a2, error: e2 } = await c2.auth.signInWithPassword({ email: USER2_EMAIL, password: USER2_PASSWORD })
  if (e2 || !a2.user) { console.error('User2 登入失敗:', e2?.message); process.exit(1) }

  const u1 = a1.user
  const u2 = a2.user
  console.log(`  User1: ${USER1_EMAIL} (${u1.id.slice(0, 8)}...)`)
  console.log(`  User2: ${USER2_EMAIL} (${u2.id.slice(0, 8)}...)\n`)

  const monthStart = currentMonthStart()
  let groupId: string | null = null

  try {
    // ───────────────────────────────────────────────────────────────────────
    // 1. 建立群組
    // ───────────────────────────────────────────────────────────────────────
    console.log('─── 1. 建立群組 ──────────────────────────────')

    const inviteCode  = `TST${Math.random().toString(36).slice(2, 5).toUpperCase()}`  // 6 chars
    const fruitOrder  = ['仁愛','喜樂','和平','忍耐','恩慈','良善','信實','溫柔','節制'].sort(() => Math.random() - 0.5)

    const { data: group, error: gErr } = await admin
      .from('groups')
      .insert({ name: '測試樹🧪', invite_code: inviteCode, fruit_order: fruitOrder, created_by: u1.id })
      .select()
      .single()

    if (gErr || !group) { console.error('建立群組失敗:', gErr?.message); process.exit(1) }
    groupId = group.id

    check(group.invite_code.length === 6,      '邀請碼長度為 6 碼', `實際: ${group.invite_code}`)
    check(Array.isArray(group.fruit_order) && group.fruit_order.length === 9, '聖靈果子順序有 9 個')
    check(group.name === '測試樹🧪',             '群組名稱正確')

    // Add both users as members — explicit joined_at so all checkins from day 1 count
    await admin.from('group_members').insert([
      { group_id: groupId, user_id: u1.id, role: 'admin',  joined_at: new Date(monthStart).toISOString() },
      { group_id: groupId, user_id: u2.id, role: 'member', joined_at: new Date(monthStart).toISOString() },
    ])

    // ───────────────────────────────────────────────────────────────────────
    // 2. 加入群組（邀請碼查詢）
    // ───────────────────────────────────────────────────────────────────────
    console.log('\n─── 2. 邀請碼與成員 ──────────────────────────')

    const { data: found } = await c2.from('groups').select('id').eq('invite_code', inviteCode).single()
    check(found?.id === groupId, '可用邀請碼查到群組')

    const { data: activeMembers } = await admin
      .from('group_members')
      .select('user_id, joined_at, left_at, role')
      .eq('group_id', groupId)
      .is('left_at', null)

    check(activeMembers?.length === 2,                          '群組有 2 位現任成員')
    check(activeMembers?.some(m => m.role === 'admin') ?? false, '其中一位是 admin')

    // ───────────────────────────────────────────────────────────────────────
    // 3. 樹成長階段：插入 25 天 × 2 人 × 10 分 = 500 分
    // ───────────────────────────────────────────────────────────────────────
    console.log('\n─── 3. 樹成長階段（0 → 500 分）──────────────')

    const checkinRows = Array.from({ length: 25 }, (_, i) => i + 1).flatMap(day => [
      { user_id: u1.id, note_date: currentMonthDate(day), points_earned: 10, is_retro: false, days_late: 0 },
      { user_id: u2.id, note_date: currentMonthDate(day), points_earned: 10, is_retro: false, days_late: 0 },
    ])

    const { error: ciErr } = await admin
      .from('checkins')
      .upsert(checkinRows, { onConflict: 'user_id,note_date' })

    if (ciErr) { console.error('插入 checkins 失敗:', ciErr.message); process.exit(1) }

    const { data: allCheckins } = await admin
      .from('checkins')
      .select('user_id, note_date, points_earned')
      .in('user_id', [u1.id, u2.id])
      .gte('note_date', monthStart)
      .lte('note_date', currentMonthDate(31))
      .order('note_date')

    const members = activeMembers as MemberRow[]

    const stageTests = [
      { maxDay:  2, expectedPts:  40, expectedStage: 1 as const, label: '40 分 → Stage 1 種子發芽'  },
      { maxDay:  5, expectedPts: 100, expectedStage: 2 as const, label: '100 分 → Stage 2 幼苗成長' },
      { maxDay: 10, expectedPts: 200, expectedStage: 3 as const, label: '200 分 → Stage 3 小樹茁壯' },
      { maxDay: 15, expectedPts: 300, expectedStage: 4 as const, label: '300 分 → Stage 4 大樹展葉' },
      { maxDay: 18, expectedPts: 360, expectedStage: 5 as const, label: '360 分 → Stage 5 種植完成' },
      { maxDay: 25, expectedPts: 500, expectedStage: 5 as const, label: '500 分 → Stage 5 持續成長' },
    ]

    for (const t of stageTests) {
      const cutoff  = currentMonthDate(t.maxDay)
      const subset  = (allCheckins ?? []).filter(c => c.note_date <= cutoff)
      const pts     = calcTreePoints(subset, members, monthStart)
      const stage   = getTreeStage(pts)
      check(pts === t.expectedPts,      `${t.label}`, `分數實際 ${pts}，期望 ${t.expectedPts}`)
      check(stage === t.expectedStage,  `  stage = ${stage}`,    `期望 ${t.expectedStage}`)
    }

    // ───────────────────────────────────────────────────────────────────────
    // 4. 聖靈果子（純函數測試）
    // ───────────────────────────────────────────────────────────────────────
    console.log('\n─── 4. 聖靈果子 ──────────────────────────────')

    const fruitTests: Array<{ pts: number; expected: number; label: string }> = [
      { pts: 349, expected: 0, label: '349 分（未種完）→ 0 顆'    },
      { pts: 350, expected: 0, label: '350 分剛種完 → 0 顆'       },
      { pts: 364, expected: 0, label: '364 分 → 0 顆'             },
      { pts: 365, expected: 1, label: '365 分 → 1 顆'             },
      { pts: 380, expected: 2, label: '380 分 → 2 顆'             },
      { pts: 395, expected: 3, label: '395 分 → 3 顆'             },
      { pts: 470, expected: 8, label: '470 分 → 8 顆'             },
      { pts: 485, expected: 9, label: '485 分 → 9 顆（滿）'       },
      { pts: 600, expected: 9, label: '600 分 → 仍然 9 顆（上限）'},
    ]

    for (const t of fruitTests) {
      const count = getFruitCount(t.pts)
      check(count === t.expected, t.label, `實際 ${count}`)
    }

    // ───────────────────────────────────────────────────────────────────────
    // 5. 休眠與歷史貢獻保留
    // ───────────────────────────────────────────────────────────────────────
    console.log('\n─── 5. 休眠 + 歷史貢獻 ───────────────────────')

    // User2 leaves after day 25 — so all 25 days of checkins remain historical contributions
    await admin
      .from('group_members')
      .update({ left_at: new Date(currentMonthDate(26)).toISOString() })
      .eq('group_id', groupId)
      .eq('user_id', u2.id)

    const { data: afterLeave } = await admin
      .from('group_members')
      .select('user_id, joined_at, left_at')
      .eq('group_id', groupId)

    const active = (afterLeave ?? []).filter(m => m.left_at === null)
    check(active.length === 1,                                  'User2 離開後現任成員剩 1 人')
    check(active.length < TREE_CONFIG.minMembers,               `人數(${active.length}) < minMembers(${TREE_CONFIG.minMembers}) → 樹休眠`)

    // Tree points now only count current active members — User2's contribution drops out
    const { data: checkinsAfter } = await admin
      .from('checkins')
      .select('user_id, note_date, points_earned')
      .in('user_id', [u1.id, u2.id])
      .gte('note_date', monthStart)
      .lte('note_date', currentMonthDate(25))

    const ptsAfter = calcTreePoints(checkinsAfter ?? [], afterLeave as MemberRow[], monthStart)
    const expectedAfter = 25 * 10  // User1 only: 25 days × 10 pts
    check(ptsAfter === expectedAfter, `User2 離開後樹點數為現任成員積分 ${expectedAfter} 分`, `實際 ${ptsAfter}`)

    // ───────────────────────────────────────────────────────────────────────
    // 6. Config 數值確認
    // ───────────────────────────────────────────────────────────────────────
    console.log('\n─── 6. Config 數值 ───────────────────────────')
    check(TREE_CONFIG.maxGroups   === 3,   `每人上限 3 個群組`)
    check(TREE_CONFIG.maxMembers  === 5,   `每組上限 5 人`)
    check(TREE_CONFIG.minMembers  === 2,   `最少 2 人才能成長`)
    check(TREE_CONFIG.fullGrowthPoints === 350, `350 分種植完成`)
    check(TREE_CONFIG.fruit.interval === 15,    `每 15 分多 1 顆果子`)
    check(TREE_CONFIG.fruit.max      === 9,     `最多 9 顆果子`)

  } finally {
    // ─── Cleanup ──────────────────────────────────────────────────────────
    console.log('\n🧹 清理測試資料...')
    if (groupId) {
      await admin.from('groups').delete().eq('id', groupId)
      console.log('    刪除測試群組（cascade 刪除 group_members）✓')
    }
    // Delete this month's checkins we inserted for both test users
    await admin
      .from('checkins')
      .delete()
      .in('user_id', [u1?.id, u2?.id].filter(Boolean))
      .gte('note_date', currentMonthDate(1))
      .lte('note_date', currentMonthDate(25))
    console.log('    刪除測試 checkins ✓')
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(48)}`)
  console.log(`  結果：${pass} ✅  ${fail > 0 ? fail + ' ❌' : ''}  （共 ${pass + fail} 項）`)
  if (fail > 0) process.exit(1)
}

main().catch(err => { console.error('\n測試錯誤:', err.message); process.exit(1) })
