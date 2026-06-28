import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ picks: null })

  const admin = createAdminClient()
  const { data } = await admin
    .from('bracket_picks')
    .select('picks')
    .eq('user_id', session.user.id)
    .single()

  return NextResponse.json({ picks: data?.picks ?? null })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { picks } = await request.json()
  const admin = createAdminClient()

  const { error } = await admin
    .from('bracket_picks')
    .upsert({ user_id: session.user.id, picks, updated_at: new Date().toISOString() })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
