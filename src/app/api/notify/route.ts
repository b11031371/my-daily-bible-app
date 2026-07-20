import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { DEFAULT_LOCALE, getDictionary, isLocale, translate, type Locale } from '@/lib/i18n'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 計算當前台灣時間（UTC+8）的小時
  const taiwanHour = (new Date().getUTCHours() + 8) % 24

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 找出「這個小時要收通知」的用戶
  const { data: users } = await supabase
    .from('profiles')
    .select('id, language')
    .eq('notification_hour', taiwanHour)

  if (!users?.length) return NextResponse.json({ sent: 0 })

  // user_id → locale，供推播挑選文案語言。DB 存的是自由字串，
  // 用 isLocale 擋掉舊資料或已下架的語言（例如停用中的 tl）。
  const localeOf = new Map<string, Locale>(
    users.map(u => [u.id, isLocale(u.language) ? u.language : DEFAULT_LOCALE]),
  )

  // 撈出這些用戶的訂閱
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subs } = await (supabase as any)
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', [...localeOf.keys()])

  if (!subs?.length) return NextResponse.json({ sent: 0 })

  // 每種語言的 payload 只組一次，同語言的訂閱共用。
  const payloadCache = new Map<Locale, string>()
  const payloadFor = (locale: Locale) => {
    const cached = payloadCache.get(locale)
    if (cached) return cached
    const dict = getDictionary(locale)
    const payload = JSON.stringify({
      title: 'Sproutiv',
      body: translate(dict, 'push.notifyBody'),
      url: '/notes',
    })
    payloadCache.set(locale, payload)
    return payload
  }

  const staleEndpoints: string[] = []
  await Promise.allSettled(
    subs.map(async (sub: { user_id: string; endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payloadFor(localeOf.get(sub.user_id) ?? DEFAULT_LOCALE)
        )
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 410 || status === 404) staleEndpoints.push(sub.endpoint)
      }
    })
  )

  if (staleEndpoints.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('push_subscriptions')
      .delete()
      .in('endpoint', staleEndpoints)
  }

  return NextResponse.json({
    sent: subs.length - staleEndpoints.length,
    removed: staleEndpoints.length,
  })
}
