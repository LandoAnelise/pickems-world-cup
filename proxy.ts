import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getCachedValidatedUser, getAuthCookieSignature, setCachedValidatedUser } from '@/lib/auth-cache'
import { logPerf, nowMs } from '@/lib/logger'
import { clearForwardedUserHeaders, toAuthUser, type AuthUser, writeForwardedUserHeaders } from '@/lib/supabase/forwarded-user'

type ProxyCookie = {
  name: string
  value: string
  options?: unknown
}

export function proxy(request: NextRequest) {
  return handleProxy(request)
}

async function handleProxy(request: NextRequest) {
  const requestStartedAt = nowMs()
  const { pathname } = request.nextUrl
  const requestHeaders = new Headers(request.headers)
  const authCacheKey = await getAuthCookieSignature(request.cookies.getAll())
  clearForwardedUserHeaders(requestHeaders)
  let pendingCookies: ProxyCookie[] = []
  let proxyResponse = NextResponse.next({ request: { headers: requestHeaders } })

  const rebuildResponse = () => {
    proxyResponse = NextResponse.next({ request: { headers: requestHeaders } })
    pendingCookies.forEach(({ name, value, options }) => {
      proxyResponse.cookies.set(
        name,
        value,
        options as Parameters<typeof proxyResponse.cookies.set>[2]
      )
    })
  }

  const finish = (response: NextResponse, outcome: string) => {
    logPerf('proxy', 'request', nowMs() - requestStartedAt, {
      pathname,
      outcome,
    })

    return response
  }

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: ProxyCookie[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            pendingCookies = pendingCookies.filter((cookie) => cookie.name !== name)
            pendingCookies.push({ name, value, options })
          })
          rebuildResponse()
        },
      },
    }
  )

  let user: AuthUser | null = null
  let authSource = 'none'

  if (authCacheKey) {
    const cacheStartedAt = nowMs()
    user = await getCachedValidatedUser(authCacheKey)
    authSource = user ? 'cache' : 'cache-miss'

    logPerf('proxy', 'auth.cache', nowMs() - cacheStartedAt, {
      pathname,
      status: user ? 'hit' : 'miss',
    })
  }

  if (!user) {
    const authStartedAt = nowMs()
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser()

    user = supabaseUser ? toAuthUser(supabaseUser) : null
    authSource = 'supabase'

    logPerf('proxy', 'auth.getUser', nowMs() - authStartedAt, {
      pathname,
      authenticated: Boolean(user),
    })

    if (user && authCacheKey) {
      const cacheSetStartedAt = nowMs()
      await setCachedValidatedUser(authCacheKey, user)
      logPerf('proxy', 'auth.cacheSet', nowMs() - cacheSetStartedAt, {
        pathname,
        status: 'ok',
      })
    }
  }

  logPerf('proxy', 'auth.resolve', nowMs() - requestStartedAt, {
    pathname,
    authenticated: Boolean(user),
    source: authSource,
  })

  writeForwardedUserHeaders(requestHeaders, user)
  rebuildResponse()

  const isAuthRoute = pathname === '/login' || pathname === '/register' || pathname.startsWith('/auth')
  const isApiRoute = pathname.startsWith('/api')

  if (!user && !isAuthRoute && !isApiRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return finish(NextResponse.redirect(url), 'redirect-login')
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return finish(NextResponse.redirect(url), 'redirect-home')
  }

  return finish(proxyResponse, 'continue')
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest\.webmanifest|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}