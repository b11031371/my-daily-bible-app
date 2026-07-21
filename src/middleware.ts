import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from '@/lib/i18n'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  const { pathname } = request.nextUrl

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')
  const isAdminPage = pathname.startsWith('/admin')
  const isPublicPage = isAuthPage ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/auth/')

  if (!user && !isPublicPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/notes', request.url))
  }

  // 沒有語言 cookie 的登入者 = 新裝置（或剛清過瀏覽器資料）。
  // 從 profiles.language 補一份下來，語言就能跟著帳號走而非綁在瀏覽器。
  // 條件刻意收得很窄：cookie 一旦寫好就不會再進來，所以這段 DB 查詢
  // 每個裝置實際上只跑一次，不會變成每個 request 的固定成本。
  if (user && !isLocale(request.cookies.get(LOCALE_COOKIE)?.value)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('language')
      .eq('id', user.id)
      .single()

    const lang = isLocale(profile?.language) ? profile.language : DEFAULT_LOCALE

    // 同時寫進 request 與 response：前者讓「這一次」的 server render 就拿到
    // 正確語言（否則首屏會閃一次預設語言），後者才是真正存到瀏覽器。
    // response 需要以更新後的 request 重建，並把 supabase 剛續期的 auth
    // cookie 一併搬過去，否則會把 session 更新弄丟。
    request.cookies.set(LOCALE_COOKIE, lang)
    const response = NextResponse.next({ request })
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
    response.cookies.set(LOCALE_COOKIE, lang, {
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax',
    })
    return response
  }

  return supabaseResponse
}

export const config = {
  // badges/ 與 icons/ 同樣是靜態資源，必須排除：否則每張徽章圖都會多跑一次
  // session 查詢，且未登入（或 session 過期）時會被導向 /login 而載不到圖。
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|badges/|api/).*)'],
}
