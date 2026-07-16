import LocaleToggle from '@/components/i18n/LocaleToggle'

// 登入前的頁面（登入／註冊／忘記密碼／重設密碼）共用此 layout，右上角提供語言
// 切換。切換綁定整個 App 語系（寫入 bible-lang cookie）。
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div className="absolute right-4 top-4 z-10" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <LocaleToggle />
      </div>
      {children}
    </div>
  )
}
