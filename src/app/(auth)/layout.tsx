import LocaleToggle from '@/components/i18n/LocaleToggle'

// 登入前的頁面（登入／註冊／忘記密碼／重設密碼）共用此 layout，右上角提供語言
// 切換。切換綁定整個 App 語系（寫入 bible-lang cookie）。
// 高度用 svh（最小視窗高）而非 dvh：這幾頁是垂直置中的短表單，svh 固定不變，
// 置中點永遠不會飄。且頁面剛好一個視窗高、沒東西可捲，網址列就不會收起，所以
// svh 「底部留白」的代價在這裡不會發生。dvh 留給真的要填滿畫面的頁面。
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-svh">
      <div className="absolute right-4 top-4 z-10" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <LocaleToggle />
      </div>
      {children}
    </div>
  )
}
