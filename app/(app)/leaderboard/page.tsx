import { requireSupabaseUser } from '@/lib/supabase/auth'
import { cacheGet, cacheSet } from '@/lib/cache'
import { logPerf, nowMs } from '@/lib/logger'
import { type LeaderboardEntry } from '@/lib/types'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

const MEDALS = ['🥇', '🥈', '🥉']

export default async function LeaderboardPage() {
  const { supabase, user } = await requireSupabaseUser()
  const dataLoadStartedAt = nowMs()

  const cached = await cacheGet<LeaderboardEntry[]>('leaderboard')
  let entries = cached
  let error = null
  let source = cached ? 'cache' : 'rpc'

  if (!cached) {
    const rpcStartedAt = nowMs()
    const result = await supabase.rpc('get_leaderboard')
    error = result.error
    entries = result.data
    if (entries) await cacheSet('leaderboard', entries, 120)

    logPerf('page:leaderboard', 'rpc', nowMs() - rpcStartedAt, {
      count: entries?.length ?? 0,
      status: error ? 'error' : 'ok',
    })
  }

  logPerf('page:leaderboard', 'data-load', nowMs() - dataLoadStartedAt, {
    source,
    count: entries?.length ?? 0,
  })

  if (error) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>Erro ao carregar ranking: {error.message}</p>
      </div>
    )
  }

  const leaderboard: LeaderboardEntry[] = entries ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ranking</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {leaderboard.length} participante{leaderboard.length !== 1 ? 's' : ''} na disputa
        </p>
      </div>

      {leaderboard.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-4xl mb-4">🏆</p>
          <p>Nenhum palpite feito ainda. Seja o primeiro!</p>
        </div>
      ) : (
        <>
        <p className="text-xs text-muted-foreground sm:hidden mb-2">
          P. = Palpites | D. = Desfecho correto | E. = Placar exato | Pts = Pontos
        </p>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 px-2">#</TableHead>
                <TableHead>Participante</TableHead>
                <TableHead className="text-center px-2">
                  <span className="hidden sm:inline">Palpites</span>
                  <span className="sm:hidden">P.</span>
                </TableHead>
                <TableHead className="text-center px-2">
                  <span className="hidden sm:inline">Desfecho correto</span>
                  <span className="sm:hidden">D.</span>
                </TableHead>
                <TableHead className="text-center px-2">
                  <span className="hidden sm:inline">Placar exato</span>
                  <span className="sm:hidden">E.</span>
                </TableHead>
                <TableHead className="text-right px-2">Pts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((entry, i) => {
                const isCurrentUser = entry.user_id === user?.id
                return (
                  <TableRow
                    key={entry.user_id}
                    className={isCurrentUser ? 'bg-primary/5 font-semibold' : ''}
                  >
                    <TableCell className="text-center px-2">
                      {MEDALS[i] ?? <span className="text-muted-foreground text-sm">{i + 1}</span>}
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-sm">{entry.display_name ?? entry.username}</span>
                      {isCurrentUser && (
                        <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0">você</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground text-sm px-2">
                      {Number(entry.picks_count)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground text-sm px-2">
                      {Number(entry.correct_winners)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground text-sm px-2">
                      {Number(entry.exact_scores)} ⭐
                    </TableCell>
                    <TableCell className="text-right px-2">
                      <span className="text-base font-bold tabular-nums">
                        {Number(entry.total_points)}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        </>
      )}
    </div>
  )
}
