'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { type MatchWithPick } from '@/lib/types'
import { getFlagUrl } from '@/lib/flags'
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
  if (!url) return <div className="w-10 h-7 bg-muted rounded" />
  return (
    <Image
      src={url}
      alt={name}
      width={40}
      height={27}
      className="rounded object-contain"
      unoptimized
    />
  )
}

type Props = { match: MatchWithPick; userId: string }

export function MatchCard({ match, userId }: Props) {
  const locked = isLocked(match.match_date) || match.status !== 'scheduled'
  const [homeScore, setHomeScore] = useState(match.pick?.home_score?.toString() ?? '')
  const [awayScore, setAwayScore] = useState(match.pick?.away_score?.toString() ?? '')
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
        { user_id: userId, match_id: match.id, home_score: home, away_score: away },
        { onConflict: 'user_id,match_id' }
      )
      if (error) toast.error('Erro ao salvar: ' + error.message)
      else toast.success('Palpite salvo!')
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
            <span className="text-xs font-medium leading-tight">{match.home_team}</span>
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
            <span className="text-xs font-medium leading-tight">{match.away_team}</span>
          </div>
        </div>

        {!locked && (
          <div className="mt-3">
            <Button
              size="sm" onClick={handleSave}
              disabled={isPending || homeScore === '' || awayScore === ''}
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
