import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ picks: null })

  const { data } = await supabase
    .from('bracket_picks')
    .select('picks')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({ picks: data?.picks ?? null })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { picks } = await request.json()

  const { error } = await supabase
    .from('bracket_picks')
    .upsert({ user_id: user.id, picks, updated_at: new Date().toISOString() })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
