import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import { cacheGet, cacheSet } from '@/lib/cache'
import { logPerf, nowMs } from '@/lib/logger'
import { type Match, type BracketPicks } from '@/lib/types'
import ChaveamentoTabs from './ChaveamentoTabs'

export default async function ChaveamentoPage() {
  const supabase = await createClient()
  const t0 = nowMs()
  let matches = await cacheGet<Match[]>('matches:bracket')
  const source = matches ? 'cache' : 'db'

  if (!matches) {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .neq('stage', 'group')
      .order('match_date', { ascending: true })
    matches = data ?? []
    await cacheSet('matches:bracket', matches, 120)
  }

  logPerf('page:bracket', 'data-load', nowMs() - t0, {
    source,
    count: matches?.length ?? 0,
  })

  if (!matches || matches.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-4xl mb-4">🏆</p>
        <p>Fase eliminatória ainda não disponível.</p>
        <p className="text-sm mt-1">Os confrontos aparecem após a fase de grupos.</p>
      </div>
    )
  }

  const user = await getCurrentUser()
  let initialPicks: BracketPicks | null = null
  if (user) {
    const admin = createAdminClient()
    const { data: bp } = await admin
      .from('bracket_picks')
      .select('picks')
      .eq('user_id', user.id)
      .single()
    if (bp?.picks) initialPicks = bp.picks as BracketPicks
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Chaveamento</h1>
        <p className="text-muted-foreground text-sm mt-1">Fase eliminatória da Copa 2026</p>
      </div>
      <ChaveamentoTabs matches={matches as Match[]} initialPicks={initialPicks} />
    </div>
  )
}
