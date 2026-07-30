import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
// 伺服器元件要從 /dist/ssr 取圖示
import { X } from '@phosphor-icons/react/dist/ssr'
import { createClient, getUser } from '@/lib/supabase/server'
import { getServerI18n } from '@/lib/i18n/server'
import { buildRecap, MONTH_RE } from '@/lib/recap'
import { getRecapAccess } from '@/lib/recap-access'
import { formatMonth, todayString } from '@/lib/utils'
import TitleDivider from '@/components/layout/TitleDivider'
import RecapContent from '@/components/recap/RecapContent'

export default async function RecapPage({ params }: { params: Promise<{ month: string }> }) {
  // Next 16：params 是 Promise，必須 await
  const { month } = await params
  if (!MONTH_RE.test(month)) notFound()
  // 未來的月份沒東西可看，字串比對就夠（兩邊都是 YYYY-MM）
  if (month > todayString().slice(0, 7)) notFound()

  const [user, supabase, { locale, t }] = await Promise.all([getUser(), createClient(), getServerI18n()])
  if (!user) redirect('/login')

  // 後台總開關關掉時，一般用戶連貼網址直接進來都不行——不只是藏入口。
  const { canUseRecap } = await getRecapAccess(supabase, user.id)
  if (!canUseRecap) redirect('/profile')

  const recap = await buildRecap(supabase, user.id, month)

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="page-title font-bold text-heading">
          {t('recap.pageTitle', { month: formatMonth(month, locale) })}
        </h1>
        {/* 固定回個人頁而不是 router.back()：回顧可能從彈窗、個人頁、
            或直接貼網址進來，back 的去向不確定，出口反而變得不可預期。 */}
        <Link
          href="/profile"
          aria-label={t('recap.close')}
          className="shrink-0 w-9 h-9 -mr-1 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 active:opacity-50"
        >
          <X size={22} />
        </Link>
      </div>
      <TitleDivider />
      {/* 手冊的每一頁自己就是一張 surface，外面不再包卡片 */}
      <div className="mt-4">
        <RecapContent recap={recap} />
      </div>
    </div>
  )
}
