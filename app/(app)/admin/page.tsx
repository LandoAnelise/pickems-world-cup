import { redirect } from 'next/navigation'
import { requireSupabaseUser } from '@/lib/supabase/auth'
import { logPerf, nowMs } from '@/lib/logger'
import { AdminPanel } from './AdminPanel'

export default async function AdminPage() {
  const { supabase, user } = await requireSupabaseUser()
  const roleCheckStartedAt = nowMs()

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  logPerf('page:admin', 'role-check', nowMs() - roleCheckStartedAt, {
    allowed: Boolean(profile?.is_admin),
  })

  if (!profile?.is_admin) redirect('/')

  const matchesStartedAt = nowMs()
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .order('match_date', { ascending: true })

  logPerf('page:admin', 'matches', nowMs() - matchesStartedAt, {
    count: matches?.length ?? 0,
  })

  return <AdminPanel matches={matches ?? []} />
}
