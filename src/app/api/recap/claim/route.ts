import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRecap, MONTH_RE } from '@/lib/recap'
import { getRecapAccess } from '@/lib/recap-access'
import { monthRange, prevMonth, todayString } from '@/lib/utils'

/**
 * 認領「上個月回顧」並回傳手冊資料。
 *
 * 每個月第一次簽到成功後由前端呼叫。回 { recap: null } 代表這次不該跳彈窗，
 * 前端就當作沒這回事。
 *
 * 認領即標記已看過（而不是等使用者關閉彈窗）：唯一鍵讓這件事天生冪等又防併發，
 * 前端零協調。代價是網路斷在中間會漏看一次，但個人頁的 /recap/[month] 永遠進得去，
 * 而「關閉時才標記」會讓使用者強制關掉 app 後隔天再跳一次，對月度回顧更煩。
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let month = prevMonth(todayString())
  let force = false

  // 開發用逃生門：不必等到月初就能反覆測彈窗。
  // 正式環境完全忽略 body，否則任何人都能自己餵月份把彈窗叫出來。
  if (process.env.NODE_ENV !== 'production') {
    const body = await req.json().catch(() => null)
    if (typeof body?.month === 'string' && MONTH_RE.test(body.month)) {
      month = body.month
      force = true
    }
  }

  if (!force) {
    // 後台總開關關閉時，一般用戶完全不跳彈窗；admin 不受影響。
    // 開發逃生門（force）刻意跳過這關——本機測試不該被線上的開關擋住。
    const { canUseRecap } = await getRecapAccess(supabase, user.id)
    if (!canUseRecap) return NextResponse.json({ recap: null })

    // 帳號是在被回顧的月份結束之後才建立的，那個月不可能有東西。
    // 這裡直接回、且不寫認領紀錄——之後真的有資料時邏輯才不會被鎖死。
    const { data: profile } = await supabase
      .from('profiles').select('created_at').eq('id', user.id).single()
    if (profile && profile.created_at >= monthRange(month).tsEnd) {
      return NextResponse.json({ recap: null })
    }

    // 認領。ignoreDuplicates 遇到衝突時不回傳列，所以空陣列＝已經有人認領過
    // （別的分頁、別的裝置，或這個月稍早）。唯一鍵就是這裡的併發鎖。
    const { data: claimed, error } = await supabase
      .from('recap_views')
      .upsert({ user_id: user.id, month }, { onConflict: 'user_id,month', ignoreDuplicates: true })
      .select('month')
    // DB 出錯也靜默放過：回顧不該擋住簽到流程
    if (error || !claimed?.length) return NextResponse.json({ recap: null })
  }

  const recap = await buildRecap(supabase, user.id, month)

  return NextResponse.json({ recap })
}
