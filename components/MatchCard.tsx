'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { type MatchWithPick } from '@/lib/types'
import { getFlag } from '@/lib/flags'
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

type Props = {
  match: MatchWithPick
  userId: string
}

export function MatchCard({ match, userId }: Props) {
  const locked = isLocked(match.match_date) || match.status !== 'scheduled'
  const [homeScore, setHomeScore] = useState(
    match.pick?.home_score?.toString() ?? ''
  )
  const [awayScore, setAwayScore] = useState(
    match.pick?.away_score?.toString() ?? ''
  )
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    const home = parseInt(homeScore, 10)
    const away = parseInt(awayScore, 10)
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      toast.error('Digite um placar válido (números ≥ 0).')
      return
    }
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.from('picks').upsert(
        {
          user_id: userId,
          match_id: match.id,
          home_score: home,
          away_score: away,
        },
        { onConflict: 'user_id,match_id' }
      )
      if (error) {
        toast.error('Erro ao salvar palpite: ' + error.message)
      } else {
        toast.success('Palpite salvo!')
      }
    })
  }

  const pointsBadge = () => {
    if (match.status !== 'finished' || match.pick === undefined) return null
    const pts = match.pick.points ?? 0
    return (
      <Badge variant={pts === 3 ? 'default' : pts === 1 ? 'secondary' : 'outline'}>
        {pts === 3 ? '⭐ +3 pts' : pts === 1 ? '+1 pt' : '0 pts'}
      </Badge>
    )
  }

  return (
    <Card className={`transition-opacity ${locked && match.status === 'scheduled' ? 'opacity-75' : ''}`}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-3">
          <span>{formatDate(match.match_date)}</span>
          <div className="flex items-center gap-2">
            {match.status === 'live' && (
              <Badge variant="destructive" className="animate-pulse">AO VIVO</Badge>
            )}
            {match.status === 'finished' && pointsBadge()}
            {match.status === 'scheduled' && locked && (
              <Badge variant="outline">🔒 Bloqueado</Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          {/* Time da casa */}
          <div className="text-right">
            <div className="text-lg">{getFlag(match.home_team)}</div>
            <div className="font-medium text-sm leading-tight">{match.home_team}</div>
          </div>

          {/* Placar/palpite */}
          <div className="flex items-center gap-1.5">
            {match.status === 'finished' ? (
              <>
                <div className="text-center">
                  <div className="text-lg font-bold">{match.home_score}</div>
                  {match.pick && (
                    <div className="text-xs text-muted-foreground">{match.pick.home_score}</div>
                  )}
                </div>
                <div className="text-muted-foreground font-bold">×</div>
                <div className="text-center">
                  <div className="text-lg font-bold">{match.away_score}</div>
                  {match.pick && (
                    <div className="text-xs text-muted-foreground">{match.pick.away_score}</div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Input
                  type="number"
                  min="0"
                  max="99"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  disabled={locked}
                  className="w-12 text-center px-1 h-9 text-lg font-semibold"
                  placeholder="?"
                />
                <span className="text-muted-foreground font-bold">×</span>
                <Input
                  type="number"
                  min="0"
                  max="99"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  disabled={locked}
                  className="w-12 text-center px-1 h-9 text-lg font-semibold"
                  placeholder="?"
                />
              </>
            )}
          </div>

          {/* Time visitante */}
          <div className="text-left">
            <div className="text-lg">{getFlag(match.away_team)}</div>
            <div className="font-medium text-sm leading-tight">{match.away_team}</div>
          </div>
        </div>

        {match.status === 'finished' && match.pick && (
          <div className="text-center text-xs text-muted-foreground mt-2">
            Seu palpite: {match.pick.home_score} × {match.pick.away_score}
          </div>
        )}

        {!locked && (
          <div className="mt-3 flex justify-center">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending || homeScore === '' || awayScore === ''}
              className="w-full max-w-[200px]"
            >
              {isPending ? 'Salvando...' : match.pick ? 'Atualizar palpite' : 'Salvar palpite'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
