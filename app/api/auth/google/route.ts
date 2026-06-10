import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const siteUrl = (process.env.SITE_URL ?? new URL(request.url).origin).replace(/\/$/, '')

  // Acumula os cookies que o Supabase quer setar (code verifier do PKCE)
  const pendingCookies: Array<{ name: string; value: string; options: CookieOptions }> = []

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => pendingCookies.push(...cookies),
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

  // Copia os cookies do PKCE para o redirect response
  const response = NextResponse.redirect(data.url)
  pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
  return response
}
