import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const siteUrl = (process.env.SITE_URL ?? new URL(request.url).origin).replace(/\/$/, '')
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const redirectTo = `${siteUrl}${next}`
    const redirectResponse = NextResponse.redirect(redirectTo)

    // Cria o cliente com cookies lidos do request e escritos direto na response
    // Isso garante que os cookies de sessão estejam presentes no redirect
    const supabase = createServerClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              redirectResponse.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return redirectResponse
    }
  }

  return NextResponse.redirect(`${siteUrl}/login?error=Erro+ao+autenticar+com+Google`)
}
