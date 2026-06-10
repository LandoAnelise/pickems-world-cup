import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { type Match } from '@/lib/types'
import { getFlagUrl, getTeamName } from '@/lib/flags'

const ROUNDS = [
  { stage: 'r32', label: 'Oitavas' },
  { stage: 'r16', label: 'Quartas' },
  { stage: 'qf', label: 'Semifinal' },
  { stage: 'sf', label: 'Final' },
  { stage: 'final', label: 'Grande Final' },
]

function TeamRow({
  team,
  score,
  isWinner,
}: {
  team: string
  score: number | null
  isWinner: boolean
}) {
  const flagUrl = getFlagUrl(team)
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-[5px] ${
        isWinner ? 'bg-primary/10 font-semibold' : 'text-muted-foreground'
      }`}
    >
      {flagUrl ? (
        <Image src={flagUrl} alt={team} width={20} height={14} unoptimized className="rounded object-contain shrink-0" />
      ) : (
        <div className="w-5 h-3.5 bg-muted rounded shrink-0" />
      )}
      <span className="flex-1 truncate text-[11px] leading-tight">
        {team ? getTeamName(team) : 'A definir'}
      </span>
      {score !== null && (
        <span className="tabular-nums text-xs font-bold ml-1">{score}</span>
      )}
    </div>
  )
}

function BracketMatch({ match }: { match: Match }) {
  const finished = match.status === 'finished'
  const homeWins = finished && (match.home_score ?? 0) > (match.away_score ?? 0)
  const awayWins = finished && (match.away_score ?? 0) > (match.home_score ?? 0)
  return (
    <div className="rounded border bg-card overflow-hidden shadow-sm w-44 shrink-0">
      <TeamRow team={match.home_team} score={match.home_score} isWinner={homeWins} />
      <div className="border-t" />
      <TeamRow team={match.away_team} score={match.away_score} isWinner={awayWins} />
    </div>
  )
}

export default async function ChaveamentoPage() {
  const supabase = await createClient()
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .neq('stage', 'group')
    .order('match_date', { ascending: true })

  if (!matches || matches.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-4xl mb-4">🏆</p>
        <p>Fase eliminatória ainda não disponível.</p>
        <p className="text-sm mt-1">Os confrontos aparecem após a fase de grupos.</p>
      </div>
    )
  }

  const byStage = new Map<string, Match[]>()
  for (const m of matches as Match[]) {
    if (!byStage.has(m.stage)) byStage.set(m.stage, [])
    byStage.get(m.stage)!.push(m)
  }

  const thirdMatch = byStage.get('third')?.[0]

  // altura do container baseada no maior número de jogos (r32 = 16)
  const r32Count = byStage.get('r32')?.length ?? 8
  const SLOT = 68 // px por slot no r32
  const containerH = r32Count * SLOT

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Chaveamento</h1>
        <p className="text-muted-foreground text-sm mt-1">Fase eliminatória da Copa 2026</p>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-max">
          {ROUNDS.map(({ stage, label }) => {
            const stageMatches = byStage.get(stage)
            if (!stageMatches?.length) return null
            return (
              <div key={stage} className="flex flex-col" style={{ width: 176 }}>
                <p className="text-xs font-semibold text-center text-muted-foreground mb-2 uppercase tracking-wide">
                  {label}
                </p>
                <div
                  className="flex flex-col justify-around"
                  style={{ height: containerH }}
                >
                  {stageMatches.map((m) => (
                    <BracketMatch key={m.id} match={m} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {thirdMatch && (
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            3º Lugar
          </p>
          <BracketMatch match={thirdMatch} />
        </div>
      )}
    </div>
  )
}
