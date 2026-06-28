'use client'

import { useEffect, useState } from 'react'
import { type Match, type BracketPicks } from '@/lib/types'
import { getFlagUrl, getTeamName } from '@/lib/flags'
import { saveBracketPicks } from './actions'

// ── Constants ──────────────────────────────────────────────────────────────────
const SLOT = 68
const HALF = 8
const CARD_W = 128 // px (w-32)

// Ordem correta do chaveamento (par de times por posição no bracket)
const BRACKET_ORDER: [string, string][] = [
  // Lado esquerdo (posições 0-7)
  ['Germany', 'Paraguay'],
  ['France', 'Sweden'],
  ['South Africa', 'Canada'],
  ['Netherlands', 'Morocco'],
  ['Portugal', 'Croatia'],
  ['Spain', 'Austria'],
  ['United States', 'Bosnia and Herzegovina'],
  ['Belgium', 'Senegal'],
  // Lado direito (posições 8-15)
  ['Brazil', 'Japan'],
  ['Ivory Coast', 'Norway'],
  ['Mexico', 'Ecuador'],
  ['England', 'Democratic Republic of the Congo'],
  ['Argentina', 'Cape Verde'],
  ['Australia', 'Egypt'],
  ['Switzerland', 'Algeria'],
  ['Colombia', 'Ghana'],
]

function sortR32ByBracket(matches: Match[]): Match[] {
  const result: (Match | null)[] = new Array(16).fill(null)
  const used = new Set<string>()
  for (const m of matches) {
    const idx = BRACKET_ORDER.findIndex(
      ([h, a]) =>
        (m.home_team === h && m.away_team === a) ||
        (m.home_team === a && m.away_team === h),
    )
    if (idx >= 0 && result[idx] === null) {
      result[idx] = m
      used.add(m.id)
    }
  }
  let fill = 0
  for (const m of matches) {
    if (!used.has(m.id)) {
      while (fill < 16 && result[fill] !== null) fill++
      if (fill < 16) result[fill] = m
    }
  }
  return result.filter(Boolean) as Match[]
}

// ── Types ──────────────────────────────────────────────────────────────────────
type Picks = BracketPicks

type RoundKey = keyof Omit<Picks, 'final'>

interface PredMatch {
  home: string | null
  away: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function initPicks(): Picks {
  return {
    r32: Array(16).fill(null),
    r16: Array(8).fill(null),
    qf: Array(4).fill(null),
    sf: Array(2).fill(null),
    final: null,
  }
}

function cascadeClear(p: Picks, round: RoundKey, idx: number, team: string): Picks {
  const nextIdx = Math.floor(idx / 2)
  if (round === 'r32') {
    if (p.r16[nextIdx] !== team) return p
    p = { ...p, r16: p.r16.map((v, i) => (i === nextIdx ? null : v)) }
    return cascadeClear(p, 'r16', nextIdx, team)
  }
  if (round === 'r16') {
    if (p.qf[nextIdx] !== team) return p
    p = { ...p, qf: p.qf.map((v, i) => (i === nextIdx ? null : v)) }
    return cascadeClear(p, 'qf', nextIdx, team)
  }
  if (round === 'qf') {
    if (p.sf[nextIdx] !== team) return p
    p = { ...p, sf: p.sf.map((v, i) => (i === nextIdx ? null : v)) }
    return cascadeClear(p, 'sf', nextIdx, team)
  }
  if (round === 'sf') {
    if (p.final !== team) return p
    return { ...p, final: null }
  }
  return p
}

function applyPick(picks: Picks, round: RoundKey, idx: number, team: string | null): Picks {
  const old = picks[round][idx]
  let p: Picks = { ...picks, [round]: picks[round].map((v, i) => (i === idx ? team : v)) }
  if (old !== null && old !== team) p = cascadeClear(p, round, idx, old)
  return p
}

function padPredMatches(raw: PredMatch[], count: number): PredMatch[] {
  const result = [...raw].slice(0, count)
  while (result.length < count) result.push({ home: null, away: null })
  return result
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return 'Prazo encerrado'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${sec}s`
  return `${m}m ${sec}s`
}

// ── Shared display components ──────────────────────────────────────────────────
function TeamRowDisplay({
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
        <img src={flagUrl} alt={team} className="w-5 h-3.5 rounded object-contain shrink-0" />
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

function BracketMatchCard({ match }: { match: Match }) {
  const finished = match.status === 'finished'
  const homeWins = finished && (match.home_score ?? 0) > (match.away_score ?? 0)
  const awayWins = finished && (match.away_score ?? 0) > (match.home_score ?? 0)
  return (
    <div className="rounded border bg-card overflow-hidden shadow-sm w-32 shrink-0">
      <TeamRowDisplay team={match.home_team} score={match.home_score} isWinner={homeWins} />
      <div className="border-t" />
      <TeamRowDisplay team={match.away_team} score={match.away_score} isWinner={awayWins} />
    </div>
  )
}

function EmptyMatchCard() {
  return (
    <div className="rounded border border-dashed border-muted-foreground/25 bg-muted/10 overflow-hidden w-32 shrink-0">
      <div className="flex items-center gap-1.5 px-2 py-[5px]">
        <div className="w-5 h-3.5 bg-muted/50 rounded shrink-0" />
        <span className="flex-1 text-[10px] text-muted-foreground/40 italic">A definir</span>
      </div>
      <div className="border-t border-dashed border-muted-foreground/25" />
      <div className="flex items-center gap-1.5 px-2 py-[5px]">
        <div className="w-5 h-3.5 bg-muted/50 rounded shrink-0" />
        <span className="flex-1 text-[10px] text-muted-foreground/40 italic">A definir</span>
      </div>
    </div>
  )
}

function ResultsColumn({
  label,
  matches,
  count,
  height,
}: {
  label: string
  matches: Match[]
  count: number
  height: number
}) {
  return (
    <div className="flex flex-col" style={{ width: CARD_W }}>
      <p className="text-[10px] font-semibold text-center text-muted-foreground mb-2 uppercase tracking-wide">
        {label}
      </p>
      <div className="flex flex-col justify-around" style={{ height }}>
        {Array.from({ length: count }, (_, i) =>
          i < matches.length ? (
            <BracketMatchCard key={matches[i].id} match={matches[i]} />
          ) : (
            <EmptyMatchCard key={`empty-${i}`} />
          )
        )}
      </div>
    </div>
  )
}

// ── Prediction components ──────────────────────────────────────────────────────
function PredTeamButton({
  team,
  isPicked,
  isEliminated,
  disabled,
  onToggle,
}: {
  team: string | null
  isPicked: boolean
  isEliminated: boolean
  disabled: boolean
  onToggle: () => void
}) {
  const flagUrl = team ? getFlagUrl(team) : null
  const interactive = !!team && !disabled

  return (
    <button
      type="button"
      onClick={interactive ? onToggle : undefined}
      disabled={!interactive}
      className={`w-full flex items-center gap-1.5 px-2 py-[5px] text-left transition-all duration-150 ${
        !team
          ? 'opacity-35 cursor-default'
          : isEliminated
          ? 'opacity-25 grayscale cursor-pointer'
          : isPicked
          ? 'bg-emerald-500/15 cursor-pointer'
          : disabled
          ? 'cursor-default'
          : 'hover:bg-muted/50 cursor-pointer'
      }`}
    >
      {flagUrl ? (
        <img
          src={flagUrl}
          alt={team ?? ''}
          className="w-5 h-3.5 rounded object-contain shrink-0"
        />
      ) : (
        <div className="w-5 h-3.5 bg-muted/50 rounded shrink-0" />
      )}
      <span
        className={`flex-1 truncate text-[11px] leading-tight ${
          isPicked ? 'font-semibold' : ''
        }`}
      >
        {team ? getTeamName(team) : 'A definir'}
      </span>
    </button>
  )
}

function PredMatchCard({
  match,
  pick,
  locked,
  onPick,
}: {
  match: PredMatch
  pick: string | null
  locked: boolean
  onPick: (team: string | null) => void
}) {
  const { home, away } = match
  const homePicked = pick !== null && pick === home
  const awayPicked = pick !== null && pick === away
  const homeElim = pick !== null && !homePicked
  const awayElim = pick !== null && !awayPicked

  return (
    <div className="rounded border bg-card overflow-hidden shadow-sm w-32 shrink-0 select-none">
      <PredTeamButton
        team={home}
        isPicked={homePicked}
        isEliminated={homeElim}
        disabled={locked}
        onToggle={() => onPick(homePicked ? null : home)}
      />
      <div className="border-t" />
      <PredTeamButton
        team={away}
        isPicked={awayPicked}
        isEliminated={awayElim}
        disabled={locked}
        onToggle={() => onPick(awayPicked ? null : away)}
      />
    </div>
  )
}

function PredColumn({
  label,
  matches,
  picks,
  height,
  locked,
  onPick,
}: {
  label: string
  matches: PredMatch[]
  picks: (string | null)[]
  height: number
  locked: boolean
  onPick: (localIdx: number, team: string | null) => void
}) {
  return (
    <div className="flex flex-col" style={{ width: CARD_W }}>
      <p className="text-[10px] font-semibold text-center text-muted-foreground mb-2 uppercase tracking-wide">
        {label}
      </p>
      <div className="flex flex-col justify-around" style={{ height }}>
        {matches.map((m, i) => (
          <PredMatchCard
            key={i}
            match={m}
            pick={picks[i] ?? null}
            locked={locked}
            onPick={(team) => onPick(i, team)}
          />
        ))}
      </div>
    </div>
  )
}

// ── Bracket connector lines ────────────────────────────────────────────────────
function BracketConnector({
  count,
  height,
  reversed = false,
}: {
  count: number
  height: number
  reversed?: boolean
}) {
  const slotH = height / count

  return (
    <div className="flex flex-col shrink-0" style={{ width: 12 }}>
      {/* invisible spacer matching the column label height */}
      <p className="text-[10px] mb-2 invisible" aria-hidden>_</p>
      <svg width="12" height={height} className="text-border">
        <g stroke="currentColor" strokeWidth="1.5" fill="none">
          {count === 1 ? (
            <line x1="0" y1={slotH / 2} x2="12" y2={slotH / 2} />
          ) : (
            Array.from({ length: count / 2 }, (_, i) => {
              const y1 = i * 2 * slotH + slotH / 2
              const y2 = (i * 2 + 1) * slotH + slotH / 2
              const yMid = (y1 + y2) / 2
              return reversed ? (
                <g key={i}>
                  <polyline points={`12,${y1} 6,${y1} 6,${y2} 12,${y2}`} />
                  <line x1="6" y1={yMid} x2="0" y2={yMid} />
                </g>
              ) : (
                <g key={i}>
                  <polyline points={`0,${y1} 6,${y1} 6,${y2} 0,${y2}`} />
                  <line x1="6" y1={yMid} x2="12" y2={yMid} />
                </g>
              )
            })
          )}
        </g>
      </svg>
    </div>
  )
}

const STORAGE_KEY = 'chaveamento-picks-2026'

function loadLocalPicks(): Picks | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Picks) : null
  } catch {
    return null
  }
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ChaveamentoTabs({
  matches,
  initialPicks,
}: {
  matches: Match[]
  initialPicks?: BracketPicks | null
}) {
  const [tab, setTab] = useState<'results' | 'prediction'>('results')
  const [picks, setPicks] = useState<Picks>(() => initialPicks ?? initPicks())
  const [now, setNow] = useState(() => Date.now())
  const [savedMsg, setSavedMsg] = useState<{ type: 'ok' | 'err'; detail?: string } | null>(null)

  // Fallback: se não veio do servidor, tenta localStorage
  useEffect(() => {
    if (!initialPicks) {
      const local = loadLocalPicks()
      if (local) setPicks(local)
    }
  }, [initialPicks])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  async function handleSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(picks))
    try {
      const result = await saveBracketPicks(picks)
      setSavedMsg(result.ok ? { type: 'ok' } : { type: 'err', detail: result.error })
    } catch (e) {
      setSavedMsg({ type: 'err', detail: e instanceof Error ? e.message : String(e) })
    }
    setTimeout(() => setSavedMsg(null), 6000)
  }

  const byStage = new Map<string, Match[]>()
  for (const m of matches) {
    if (!byStage.has(m.stage)) byStage.set(m.stage, [])
    byStage.get(m.stage)!.push(m)
  }

  const r32All = sortR32ByBracket(byStage.get('r32') ?? [])
  const r16All = byStage.get('r16') ?? []
  const qfAll = byStage.get('qf') ?? []
  const sfAll = byStage.get('sf') ?? []
  const finalMatch = byStage.get('final')?.[0]
  const thirdMatch = byStage.get('third')?.[0]

  const halfH = HALF * SLOT

  // Deadline = 10 min antes do primeiro jogo dos dezesseis avos
  const firstR32Ms = r32All.length
    ? Math.min(...r32All.map((m) => new Date(m.match_date).getTime()))
    : null
  const deadline = firstR32Ms ? firstR32Ms - 10 * 60 * 1000 : null
  const isLocked = deadline !== null ? now >= deadline : false
  const timeLeft = deadline !== null ? Math.max(0, deadline - now) : null

  // Derived prediction matches (r32 teams come from DB; r16+ derived from picks)
  const r32LeftPred = padPredMatches(
    r32All.slice(0, HALF).map((m) => ({ home: m.home_team, away: m.away_team })),
    HALF,
  )
  const r32RightPred = padPredMatches(
    r32All.slice(HALF).map((m) => ({ home: m.home_team, away: m.away_team })),
    HALF,
  )

  const r16LeftPred: PredMatch[] = [0, 1, 2, 3].map((i) => ({
    home: picks.r32[i * 2] ?? null,
    away: picks.r32[i * 2 + 1] ?? null,
  }))
  const r16RightPred: PredMatch[] = [4, 5, 6, 7].map((i) => ({
    home: picks.r32[i * 2] ?? null,
    away: picks.r32[i * 2 + 1] ?? null,
  }))

  const qfLeftPred: PredMatch[] = [0, 1].map((i) => ({
    home: picks.r16[i * 2] ?? null,
    away: picks.r16[i * 2 + 1] ?? null,
  }))
  const qfRightPred: PredMatch[] = [2, 3].map((i) => ({
    home: picks.r16[i * 2] ?? null,
    away: picks.r16[i * 2 + 1] ?? null,
  }))

  const sfLeftPred: PredMatch[] = [{ home: picks.qf[0] ?? null, away: picks.qf[1] ?? null }]
  const sfRightPred: PredMatch[] = [{ home: picks.qf[2] ?? null, away: picks.qf[3] ?? null }]

  const finalPred: PredMatch = { home: picks.sf[0] ?? null, away: picks.sf[1] ?? null }

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-0 border-b">
        <button
          onClick={() => setTab('results')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'results'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Resultado
        </button>
        <button
          onClick={() => setTab('prediction')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'prediction'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Meu Chaveamento
        </button>
      </div>

      {/* ── Aba Resultado ── */}
      {tab === 'results' && (
        <>
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-0 min-w-max items-start">
              <ResultsColumn label="16 avos" matches={r32All.slice(0, HALF)} count={HALF} height={halfH} />
              <BracketConnector count={HALF} height={halfH} />
              <ResultsColumn label="Oitavas" matches={r16All.slice(0, 4)} count={4} height={halfH} />
              <BracketConnector count={4} height={halfH} />
              <ResultsColumn label="Quartas" matches={qfAll.slice(0, 2)} count={2} height={halfH} />
              <BracketConnector count={2} height={halfH} />
              <ResultsColumn label="Semifinal" matches={sfAll.slice(0, 1)} count={1} height={halfH} />
              <BracketConnector count={1} height={halfH} />

              <div className="flex flex-col" style={{ width: CARD_W }}>
                <p className="text-[10px] font-semibold text-center text-muted-foreground mb-2 uppercase tracking-wide">
                  Final
                </p>
                <div className="flex items-center justify-center" style={{ height: halfH }}>
                  {finalMatch ? <BracketMatchCard match={finalMatch} /> : <EmptyMatchCard />}
                </div>
              </div>

              <BracketConnector count={1} height={halfH} reversed />
              <ResultsColumn label="Semifinal" matches={sfAll.slice(1)} count={1} height={halfH} />
              <BracketConnector count={2} height={halfH} reversed />
              <ResultsColumn label="Quartas" matches={qfAll.slice(2)} count={2} height={halfH} />
              <BracketConnector count={4} height={halfH} reversed />
              <ResultsColumn label="Oitavas" matches={r16All.slice(4)} count={4} height={halfH} />
              <BracketConnector count={HALF} height={halfH} reversed />
              <ResultsColumn label="16 avos" matches={r32All.slice(HALF)} count={HALF} height={halfH} />
            </div>
          </div>

          {thirdMatch && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                3º Lugar
              </p>
              <BracketMatchCard match={thirdMatch} />
            </div>
          )}
        </>
      )}

      {/* ── Aba Meu Chaveamento ── */}
      {tab === 'prediction' && (
        <>
          {/* Aviso + countdown */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                Não vale pontos
              </span>
              {isLocked ? (
                <span className="text-xs text-destructive font-medium flex items-center gap-1">
                  🔒 Prazo encerrado — chaveamento bloqueado
                </span>
              ) : timeLeft !== null ? (
                <span
                  className={`text-xs font-mono font-medium tabular-nums ${
                    timeLeft < 60 * 60 * 1000 ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  ⏱ Disponível por mais: {formatTimeLeft(timeLeft)}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Clique nos times para montar seu chaveamento
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {savedMsg?.type === 'ok' && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Salvo!
                </span>
              )}
              {savedMsg?.type === 'err' && (
                <span className="text-xs text-destructive font-medium">
                  Erro: {savedMsg.detail ?? 'desconhecido'}
                </span>
              )}
              {!isLocked && (
                <button
                  onClick={() => setPicks(initPicks())}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Resetar
                </button>
              )}
              <button
                onClick={handleSave}
                className="text-xs font-medium bg-primary text-primary-foreground px-3 py-1 rounded hover:bg-primary/90 transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>

          <div className="overflow-x-auto pb-4">
            <div className="flex gap-0 min-w-max items-start">
              {/* Lado esquerdo */}
              <PredColumn
                label="16 avos"
                matches={r32LeftPred}
                picks={picks.r32.slice(0, 8)}
                height={halfH}
                locked={isLocked}
                onPick={(i, team) => setPicks((p) => applyPick(p, 'r32', i, team))}
              />
              <BracketConnector count={HALF} height={halfH} />
              <PredColumn
                label="Oitavas"
                matches={r16LeftPred}
                picks={picks.r16.slice(0, 4)}
                height={halfH}
                locked={isLocked}
                onPick={(i, team) => setPicks((p) => applyPick(p, 'r16', i, team))}
              />
              <BracketConnector count={4} height={halfH} />
              <PredColumn
                label="Quartas"
                matches={qfLeftPred}
                picks={picks.qf.slice(0, 2)}
                height={halfH}
                locked={isLocked}
                onPick={(i, team) => setPicks((p) => applyPick(p, 'qf', i, team))}
              />
              <BracketConnector count={2} height={halfH} />
              <PredColumn
                label="Semifinal"
                matches={sfLeftPred}
                picks={picks.sf.slice(0, 1)}
                height={halfH}
                locked={isLocked}
                onPick={(i, team) => setPicks((p) => applyPick(p, 'sf', i, team))}
              />
              <BracketConnector count={1} height={halfH} />

              {/* Final (centro) */}
              <div className="flex flex-col" style={{ width: CARD_W }}>
                <p className="text-[10px] font-semibold text-center text-muted-foreground mb-2 uppercase tracking-wide">
                  Final
                </p>
                <div className="flex items-center justify-center" style={{ height: halfH }}>
                  <PredMatchCard
                    match={finalPred}
                    pick={picks.final}
                    locked={isLocked}
                    onPick={(team) =>
                      setPicks((p) => ({ ...p, final: p.final === team ? null : team }))
                    }
                  />
                </div>
              </div>

              {/* Lado direito (espelhado) */}
              <BracketConnector count={1} height={halfH} reversed />
              <PredColumn
                label="Semifinal"
                matches={sfRightPred}
                picks={picks.sf.slice(1, 2)}
                height={halfH}
                locked={isLocked}
                onPick={(i, team) => setPicks((p) => applyPick(p, 'sf', i + 1, team))}
              />
              <BracketConnector count={2} height={halfH} reversed />
              <PredColumn
                label="Quartas"
                matches={qfRightPred}
                picks={picks.qf.slice(2, 4)}
                height={halfH}
                locked={isLocked}
                onPick={(i, team) => setPicks((p) => applyPick(p, 'qf', i + 2, team))}
              />
              <BracketConnector count={4} height={halfH} reversed />
              <PredColumn
                label="Oitavas"
                matches={r16RightPred}
                picks={picks.r16.slice(4, 8)}
                height={halfH}
                locked={isLocked}
                onPick={(i, team) => setPicks((p) => applyPick(p, 'r16', i + 4, team))}
              />
              <BracketConnector count={HALF} height={halfH} reversed />
              <PredColumn
                label="16 avos"
                matches={r32RightPred}
                picks={picks.r32.slice(8, 16)}
                height={halfH}
                locked={isLocked}
                onPick={(i, team) => setPicks((p) => applyPick(p, 'r32', i + 8, team))}
              />
            </div>
          </div>
        </>
      )}
    </>
  )
}
