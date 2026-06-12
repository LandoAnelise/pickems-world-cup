'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { savePick } from '@/app/actions/picks'
import { type MatchWithPick } from '@/lib/types'
import { getFlagUrl, getTeamName } from '@/lib/flags'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function isLocked(matchDate: string): boolean {
  return new Date(matchDate).getTime() - Date.now() < 10 * 60 * 1000
}

function TeamFlag({ name }: { name: string }) {
  const url = getFlagUrl(name)
  return (
    <div className="w-10 h-7 shrink-0 flex items-center justify-center">
      {url ? (
        <img src={url} alt={name} className="max-w-full max-h-full object-contain rounded" />
      ) : (
        <div className="w-full h-full bg-muted rounded" />
      )}
    </div>
  )
}

type Props = { match: MatchWithPick; userId: string; groupLabel?: string }

export function MatchCard({ match, userId, groupLabel }: Props) {
  const locked = isLocked(match.match_date) || match.status !== 'scheduled'
  const [homeScore, setHomeScore] = useState(match.pick?.home_score?.toString() ?? '')
  const [awayScore, setAwayScore] = useState(match.pick?.away_score?.toString() ?? '')
  const [savedHomeScore, setSavedHomeScore] = useState(match.pick?.home_score?.toString() ?? '')
  const [savedAwayScore, setSavedAwayScore] = useState(match.pick?.away_score?.toString() ?? '')
  const [isPending, startTransition] = useTransition()
  const isDirty = homeScore !== savedHomeScore || awayScore !== savedAwayScore

  function handleSave() {
    const home = parseInt(homeScore, 10)
    const away = parseInt(awayScore, 10)
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      toast.error('Digite um placar válido (números ≥ 0).')
      return
    }
    startTransition(async () => {
      const result = await savePick(match.id, home, away)
      if (result.error) toast.error('Erro ao salvar: ' + result.error)
      else {
        setSavedHomeScore(home.toString())
        setSavedAwayScore(away.toString())
        toast.success('Palpite salvo!')
      }
    })
  }

  const pts = match.pick?.points ?? 0
  const showPoints = match.status === 'finished' && match.pick !== undefined

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 text-xs text-muted-foreground border-b">
        <span>{formatDate(match.match_date)}</span>
        <div className="flex items-center gap-1.5">
          {groupLabel && <span className="font-medium text-foreground">{groupLabel}</span>}
          {match.status === 'live' && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 animate-pulse">AO VIVO</Badge>
          )}
          {showPoints && (
            <Badge variant={pts === 3 ? 'default' : pts === 1 ? 'secondary' : 'outline'} className="text-[10px] px-1.5 py-0">
              {pts === 3 ? '⭐ +3 pts' : pts === 1 ? '+1 pt' : '0 pts'}
            </Badge>
          )}
          {match.status === 'scheduled' && locked && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">🔒 Bloqueado</Badge>
          )}
        </div>
      </div>

      <CardContent className="pt-4 pb-3 px-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {/* Time da casa */}
          <div className="flex flex-col items-center gap-1.5 text-center">
            <TeamFlag name={match.home_team} />
            <span className="text-xs font-medium leading-tight line-clamp-2 w-full h-8 flex items-center justify-center">{getTeamName(match.home_team)}</span>
          </div>

          {/* Placar */}
          <div className="flex flex-col items-center gap-1">
            {match.status === 'finished' ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tabular-nums">{match.home_score}</span>
                <span className="text-muted-foreground font-bold">×</span>
                <span className="text-xl font-bold tabular-nums">{match.away_score}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Input
                  type="number" min="0" max="99"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  disabled={locked}
                  className="w-11 text-center px-1 h-9 text-base font-semibold"
                  placeholder="?"
                />
                <span className="text-muted-foreground font-bold text-sm">×</span>
                <Input
                  type="number" min="0" max="99"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  disabled={locked}
                  className="w-11 text-center px-1 h-9 text-base font-semibold"
                  placeholder="?"
                />
              </div>
            )}
            {showPoints && match.pick && (
              <span className="text-[10px] text-muted-foreground">
                seu palpite: {match.pick.home_score}×{match.pick.away_score}
              </span>
            )}
          </div>

          {/* Time visitante */}
          <div className="flex flex-col items-center gap-1.5 text-center">
            <TeamFlag name={match.away_team} />
            <span className="text-xs font-medium leading-tight line-clamp-2 w-full h-8 flex items-center justify-center">{getTeamName(match.away_team)}</span>
          </div>
        </div>

        {!locked && (
          <div className="mt-3">
            <Button
              size="sm" onClick={handleSave}
              disabled={isPending || homeScore === '' || awayScore === '' || !isDirty}
              className="w-full"
            >
              {isPending ? 'Salvando...' : match.pick ? 'Atualizar palpite' : 'Salvar palpite'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
