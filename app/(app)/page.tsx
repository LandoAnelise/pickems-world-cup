import { createClient } from '@/lib/supabase/server'
import { type Match, type Pick, type MatchWithPick } from '@/lib/types'
import { MatchCard } from '@/components/MatchCard'

const STAGE_LABELS: Record<string, string> = {
  group: 'Fase de Grupos',
  r32: 'Oitavas de Final',
  r16: 'Quartas de Final',
  qf: 'Semifinal',
  sf: 'Final',
  final: 'Grande Final',
  third: '3º Lugar',
}

const STAGE_ORDER = ['group', 'r32', 'r16', 'qf', 'sf', 'final', 'third']

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: matches }, { data: picks }] = await Promise.all([
    supabase.from('matches').select('*').order('match_date', { ascending: true }),
    supabase.from('picks').select('*').eq('user_id', user!.id),
  ])

  const picksMap = new Map<string, Pick>(
    (picks ?? []).map((p: Pick) => [p.match_id, p])
  )

  const matchesWithPicks: MatchWithPick[] = (matches ?? []).map((m: Match) => ({
    ...m,
    pick: picksMap.get(m.id),
  }))

  // Agrupar por stage e, dentro de 'group', por group_name
  const byStage = new Map<string, Map<string, MatchWithPick[]>>()
  for (const m of matchesWithPicks) {
    if (!byStage.has(m.stage)) byStage.set(m.stage, new Map())
    const key = m.stage === 'group' ? (m.group_name ?? 'X') : 'main'
    const stageMap = byStage.get(m.stage)!
    if (!stageMap.has(key)) stageMap.set(key, [])
    stageMap.get(key)!.push(m)
  }

  if (matchesWithPicks.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-4xl mb-4">⚽</p>
        <p className="text-lg font-medium">Nenhum jogo carregado ainda.</p>
        <p className="text-sm mt-1">
          Um admin precisa importar os jogos na página{' '}
          <span className="font-mono bg-muted px-1 rounded">Admin → Importar jogos</span>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Seus Palpites</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Acertar o vencedor = 1 pt · Acertar o placar exato = 3 pts
        </p>
      </div>

      {STAGE_ORDER.filter((s) => byStage.has(s)).map((stage) => (
        <section key={stage}>
          <h2 className="text-lg font-semibold mb-4 pb-2 border-b">
            {STAGE_LABELS[stage] ?? stage}
          </h2>

          {stage === 'group' ? (
            <div className="space-y-6">
              {Array.from(byStage.get(stage)!.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([groupName, groupMatches]) => (
                  <div key={groupName}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      Grupo {groupName}
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {groupMatches.map((m) => (
                        <MatchCard key={m.id} match={m} userId={user!.id} />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from(byStage.get(stage)!.values())
                .flat()
                .map((m) => (
                  <MatchCard key={m.id} match={m} userId={user!.id} />
                ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
