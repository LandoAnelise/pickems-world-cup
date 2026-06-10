import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { cacheGet, cacheSet } from '@/lib/cache'
import { type Match, type Pick, type MatchWithPick } from '@/lib/types'
import { MatchCard } from '@/components/MatchCard'
import { PicksFilterTabs } from '@/components/PicksFilterTabs'
import { GroupSection } from '@/components/GroupSection'
import { DaySection } from '@/components/DaySection'

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

function getDayKey(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit',
  })
}

function getDayLabel(dateStr: string) {
  const weekday = new Date(dateStr).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo', weekday: 'long',
  })
  const day = getDayKey(dateStr)
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${day}`
}

type Filter = 'upcoming' | 'finished' | 'all'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter: rawFilter } = await searchParams
  const filter: Filter =
    rawFilter === 'finished' || rawFilter === 'all' ? rawFilter : 'upcoming'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [matches, picks] = await Promise.all([
    cacheGet<Match[]>('matches:all').then(async (cached) => {
      if (cached) return cached
      const { data } = await supabase.from('matches').select('*').order('match_date', { ascending: true })
      if (data) await cacheSet('matches:all', data, 120)
      return data ?? []
    }),
    cacheGet<Pick[]>(`picks:${user!.id}`).then(async (cached) => {
      if (cached) return cached
      const { data } = await supabase.from('picks').select('*').eq('user_id', user!.id)
      if (data) await cacheSet(`picks:${user!.id}`, data, 300)
      return data ?? []
    }),
  ])

  const picksMap = new Map<string, Pick>(
    picks.map((p: Pick) => [p.match_id, p])
  )

  const allMatches: MatchWithPick[] = matches.map((m: Match) => ({
    ...m,
    pick: picksMap.get(m.id),
  }))

  const filtered = allMatches.filter((m) => {
    if (filter === 'finished') return m.status === 'finished'
    if (filter === 'upcoming') return m.status !== 'finished'
    return true
  })

  // Agrupar por stage e, dentro de 'group', por group_name
  const byStage = new Map<string, Map<string, MatchWithPick[]>>()
  for (const m of filtered) {
    if (!byStage.has(m.stage)) byStage.set(m.stage, new Map())
    const key = m.stage === 'group' ? (m.group_name ?? 'X') : 'main'
    const stageMap = byStage.get(m.stage)!
    if (!stageMap.has(key)) stageMap.set(key, [])
    stageMap.get(key)!.push(m)
  }

  const emptyMessages: Record<Filter, string> = {
    upcoming: 'Nenhum jogo pendente. Todos os jogos já foram concluídos!',
    finished: 'Nenhum jogo concluído ainda.',
    all: 'Nenhum jogo carregado ainda. Um admin precisa importar os jogos.',
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Seus Palpites</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Acertar o vencedor = 1 pt · Acertar o placar exato = 3 pts
        </p>
      </div>

      <Suspense>
        <PicksFilterTabs />
      </Suspense>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-4xl mb-4">⚽</p>
          <p>{emptyMessages[filter]}</p>
        </div>
      ) : filter === 'upcoming' ? (
        <div className="space-y-6">
          {(() => {
            const byDay = new Map<string, MatchWithPick[]>()
            for (const m of filtered) {
              const key = getDayKey(m.match_date)
              if (!byDay.has(key)) byDay.set(key, [])
              byDay.get(key)!.push(m)
            }
            return Array.from(byDay.entries()).map(([key, dayMatches]) => (
              <DaySection
                key={key}
                label={getDayLabel(dayMatches[0].match_date)}
                matches={dayMatches}
                userId={user!.id}
              />
            ))
          })()}
        </div>
      ) : (
        <div className="space-y-8">
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
                      <GroupSection
                        key={groupName}
                        groupName={groupName}
                        matches={groupMatches}
                        userId={user!.id}
                      />
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
      )}
    </div>
  )
}
