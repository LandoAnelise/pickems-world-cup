import { createClient } from '@/lib/supabase/server'
import { type LeaderboardEntry } from '@/lib/types'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

const MEDALS = ['🥇', '🥈', '🥉']

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: entries, error } = await supabase.rpc('get_leaderboard')

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
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Participante</TableHead>
                <TableHead className="text-center">Palpites</TableHead>
                <TableHead className="text-center">Vencedor certo</TableHead>
                <TableHead className="text-center">Placar exato</TableHead>
                <TableHead className="text-right">Pontos</TableHead>
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
                    <TableCell className="text-center">
                      {MEDALS[i] ?? <span className="text-muted-foreground">{i + 1}</span>}
                    </TableCell>
                    <TableCell>
                      <span>{entry.display_name ?? entry.username}</span>
                      {isCurrentUser && (
                        <Badge variant="outline" className="ml-2 text-xs">você</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {Number(entry.picks_count)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {Number(entry.correct_winners)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {Number(entry.exact_scores)} ⭐
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-lg font-bold tabular-nums">
                        {Number(entry.total_points)}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
