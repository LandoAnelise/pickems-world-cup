import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import { readForwardedUserHeaders } from '@/lib/supabase/forwarded-user'

export async function GET() {
  const headerStore = await headers()
  const user = readForwardedUserHeaders(headerStore)
  if (!user) return NextResponse.json({ picks: null })

  const admin = createAdminClient()
  const { data } = await admin
    .from('bracket_picks')
    .select('picks')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({ picks: data?.picks ?? null })
}

export async function POST(request: Request) {
  const headerStore = await headers()
  const user = readForwardedUserHeaders(headerStore)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { picks } = await request.json()
  const admin = createAdminClient()

  const { error } = await admin
    .from('bracket_picks')
    .upsert({ user_id: user.id, picks, updated_at: new Date().toISOString() })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
