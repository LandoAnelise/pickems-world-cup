import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const siteUrl = (process.env.SITE_URL ?? new URL(request.url).origin).replace(/\/$/, '')

  // Response temporária para capturar os cookies do PKCE antes de saber a URL final
  const cookieResponse = NextResponse.redirect(siteUrl)

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
      skipBrowserRedirect: true,
    },
  })

  if (error || !data.url) {
    const msg = error?.message ?? 'Erro ao autenticar com Google'
    return NextResponse.redirect(`${siteUrl}/login?error=${encodeURIComponent(msg)}`)
  }

  // Redireciona para o Google levando os cookies do PKCE
  const response = NextResponse.redirect(data.url)
  cookieResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
  return response
}
