'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Image from 'next/image'
import { type Match } from '@/lib/types'
import { getFlagUrl, getTeamName } from '@/lib/flags'
import { syncFixtures, syncResults, setManualResult, resetMatch } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Props = { matches: Match[] }

export function AdminPanel({ matches: initialMatches }: Props) {
  const router = useRouter()
  const [syncFixturePending, startSyncFixture] = useTransition()
  const [syncResultsPending, startSyncResults] = useTransition()
  const [manualScores, setManualScores] = useState<
    Record<string, { home: string; away: string }>
  >({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const pendingMatches = initialMatches.filter((m) => m.status !== 'finished')
  const finishedMatches = initialMatches.filter((m) => m.status === 'finished')
  const [resettingId, setResettingId] = useState<string | null>(null)

  function handleSyncFixtures() {
    startSyncFixture(async () => {
      const result = await syncFixtures()
      if (result.error) toast.error(result.error)
      else {
        toast.success(`${result.imported} jogos importados da API!`)
        router.refresh()
      }
    })
  }

  function handleSyncResults() {
    startSyncResults(async () => {
      const result = await syncResults()
      if (result.error) toast.error(result.error)
      else {
        toast.success(
          `${result.updatedMatches} jogos sincronizados · ${result.updatedPicks} palpites calculados`
        )
        router.refresh()
      }
    })
  }

  async function handleReset(matchId: string) {
    setResettingId(matchId)
    const result = await resetMatch(matchId)
    setResettingId(null)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Jogo revertido para "próximos". Sincronize quando terminar.')
      router.refresh()
    }
  }

  async function handleManualResult(matchId: string) {
    const scores = manualScores[matchId]
    if (!scores) return
    const home = parseInt(scores.home, 10)
    const away = parseInt(scores.away, 10)
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      toast.error('Digite um placar válido.')
      return
    }
    setSavingId(matchId)
    const result = await setManualResult(matchId, home, away)
    setSavingId(null)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Resultado salvo e pontos calculados!')
      router.refresh()
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Painel Admin</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie jogos e resultados da Copa 2026.
        </p>
      </div>

      {/* Sincronização */}
      <Card>
        <CardHeader>
          <CardTitle>Sincronização com worldcup26.ir</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSyncFixtures} disabled={syncFixturePending} variant="outline">
              {syncFixturePending ? 'Importando...' : '📥 Importar jogos (1ª vez)'}
            </Button>
            <Button onClick={handleSyncResults} disabled={syncResultsPending}>
              {syncResultsPending ? 'Sincronizando...' : '🔄 Sincronizar resultados agora'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            O cron automático roda a cada 2 minutos na Vercel (plano Pro).
            Use os botões acima para sincronização manual.
          </p>
        </CardContent>
      </Card>

      {/* Reverter jogo encerrado incorretamente */}
      <Card>
        <CardHeader>
          <CardTitle>Reverter jogo encerrado incorretamente</CardTitle>
        </CardHeader>
        <CardContent>
          {finishedMatches.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum jogo finalizado ainda.</p>
          ) : (
            <div className="space-y-2">
              {finishedMatches.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-3 rounded-lg border text-sm flex-wrap"
                >
                  <Badge variant="outline" className="shrink-0">
                    {m.group_name ?? m.stage.toUpperCase()}
                  </Badge>
                  <span className="flex-1 min-w-[180px] flex items-center gap-1.5">
                    {getFlagUrl(m.home_team) && <Image src={getFlagUrl(m.home_team)} alt={m.home_team} width={24} height={16} unoptimized className="rounded" />}
                    {getTeamName(m.home_team)}
                    <span className="text-muted-foreground mx-1">
                      {m.home_score ?? '?'} × {m.away_score ?? '?'}
                    </span>
                    {getFlagUrl(m.away_team) && <Image src={getFlagUrl(m.away_team)} alt={m.away_team} width={24} height={16} unoptimized className="rounded" />}
                    {getTeamName(m.away_team)}
                  </span>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReset(m.id)}
                    disabled={resettingId === m.id}
                  >
                    {resettingId === m.id ? 'Revertendo...' : 'Reverter para próximos'}
                  </Button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Use quando a API marcar um jogo como encerrado antes do tempo. Após reverter, o jogo volta para "Próximos" e os palpites são liberados novamente.
          </p>
        </CardContent>
      </Card>

      {/* Resultado manual (fallback) */}
      <Card>
        <CardHeader>
          <CardTitle>Inserir resultado manualmente (fallback)</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingMatches.length === 0 ? (
            <p className="text-muted-foreground text-sm">Todos os jogos já foram finalizados.</p>
          ) : (
            <div className="space-y-2">
              {pendingMatches.map((m) => {
                const scores = manualScores[m.id] ?? { home: '', away: '' }
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-3 rounded-lg border text-sm flex-wrap"
                  >
                    <Badge variant="outline" className="shrink-0">
                      {m.group_name ?? m.stage.toUpperCase()}
                    </Badge>
                    <span className="flex-1 min-w-[180px] flex items-center gap-1.5">
                      {getFlagUrl(m.home_team) && <Image src={getFlagUrl(m.home_team)} alt={m.home_team} width={24} height={16} unoptimized className="rounded" />}
                      {getTeamName(m.home_team)}
                      <span className="text-muted-foreground mx-1">×</span>
                      {getFlagUrl(m.away_team) && <Image src={getFlagUrl(m.away_team)} alt={m.away_team} width={24} height={16} unoptimized className="rounded" />}
                      {getTeamName(m.away_team)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number" min="0" max="99"
                        value={scores.home}
                        onChange={(e) =>
                          setManualScores((prev) => ({
                            ...prev,
                            [m.id]: { ...scores, home: e.target.value },
                          }))
                        }
                        className="w-12 text-center px-1 h-8"
                        placeholder="?"
                      />
                      <span>×</span>
                      <Input
                        type="number" min="0" max="99"
                        value={scores.away}
                        onChange={(e) =>
                          setManualScores((prev) => ({
                            ...prev,
                            [m.id]: { ...scores, away: e.target.value },
                          }))
                        }
                        className="w-12 text-center px-1 h-8"
                        placeholder="?"
                      />
                    </div>
                    <Button
                      size="sm" variant="secondary"
                      onClick={() => handleManualResult(m.id)}
                      disabled={savingId === m.id || !scores.home || !scores.away}
                    >
                      {savingId === m.id ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
