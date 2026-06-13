'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { requireSupabaseUser } from '@/lib/supabase/auth'
import { fetchAllGames } from '@/lib/worldcup-api'
import { calcPoints } from '@/lib/scoring'

async function requireAdmin() {
  const { supabase, user } = await requireSupabaseUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/')
  return { supabase, adminClient: createAdminClient() }
}

export async function syncFixtures(): Promise<{ imported: number; error?: string }> {
  const { adminClient } = await requireAdmin()

  let games
  try {
    games = await fetchAllGames()
  } catch (e) {
    return { imported: 0, error: String(e) }
  }

  const readyGames = games.filter((g) => g.home_team && g.away_team)

  const { error } = await adminClient.from('matches').upsert(
    readyGames.map((g) => ({
      external_id: g.id,
      stage: g.type,
      group_name: g.group,
      home_team: g.home_team,
      away_team: g.away_team,
      match_date: g.match_date,
    })),
    { onConflict: 'external_id', ignoreDuplicates: false }
  )

  if (error) return { imported: 0, error: error.message }
  return { imported: readyGames.length }
}

export async function syncResults(): Promise<{ updatedMatches: number; updatedPicks: number; error?: string }> {
  const { adminClient } = await requireAdmin()

  let games
  try {
    games = await fetchAllGames()
  } catch (e) {
    return { updatedMatches: 0, updatedPicks: 0, error: String(e) }
  }

  const finishedGames = games.filter((g) => g.finished)
  let updatedMatches = 0
  let updatedPicks = 0

  for (const game of finishedGames) {
    const { data: match } = await adminClient
      .from('matches')
      .update({ home_score: game.home_score, away_score: game.away_score, status: 'finished' })
      .eq('external_id', game.id)
      .neq('status', 'finished')
      .select('id')
      .single()

    if (!match) continue
    updatedMatches++

    const { data: picks } = await adminClient
      .from('picks')
      .select('id, home_score, away_score')
      .eq('match_id', match.id)

    for (const pick of picks ?? []) {
      const points = calcPoints(
        { home_score: pick.home_score, away_score: pick.away_score },
        { home_score: game.home_score, away_score: game.away_score }
      )
      await adminClient.from('picks').update({ points }).eq('id', pick.id)
      updatedPicks++
    }
  }

  return { updatedMatches, updatedPicks }
}

export async function resetMatch(matchId: string): Promise<{ error?: string }> {
  const { adminClient } = await requireAdmin()

  const { error: matchError } = await adminClient
    .from('matches')
    .update({ status: 'live', home_score: null, away_score: null })
    .eq('id', matchId)

  if (matchError) return { error: matchError.message }

  // Zera os pontos dos picks para que o cálculo rode novamente quando o jogo acabar
  await adminClient.from('picks').update({ points: null }).eq('match_id', matchId)

  return {}
}

export async function setManualResult(
  matchId: string,
  homeScore: number,
  awayScore: number
): Promise<{ error?: string }> {
  const { adminClient } = await requireAdmin()

  const { data: match, error: matchError } = await adminClient
    .from('matches')
    .update({ home_score: homeScore, away_score: awayScore, status: 'finished' })
    .eq('id', matchId)
    .select('id')
    .single()

  if (matchError || !match) return { error: matchError?.message ?? 'Jogo não encontrado' }

  const { data: picks } = await adminClient
    .from('picks')
    .select('id, home_score, away_score')
    .eq('match_id', matchId)

  for (const pick of picks ?? []) {
    const points = calcPoints(
      { home_score: pick.home_score, away_score: pick.away_score },
      { home_score: homeScore, away_score: awayScore }
    )
    await adminClient.from('picks').update({ points }).eq('id', pick.id)
  }

  return {}
}
