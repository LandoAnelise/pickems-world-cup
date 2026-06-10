import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { fetchAllGames } from '@/lib/worldcup-api'
import { calcPoints } from '@/lib/scoring'
import { cacheDel, cacheDelPattern } from '@/lib/cache'

export async function POST(request: Request) {
  if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const games = await fetchAllGames()
  const finishedGames = games.filter((g) => g.finished)

  let updatedMatches = 0
  let updatedPicks = 0

  for (const game of finishedGames) {
    // Atualiza apenas jogos que ainda não foram marcados como finished
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .update({
        home_score: game.home_score,
        away_score: game.away_score,
        status: 'finished',
      })
      .eq('external_id', game.id)
      .neq('status', 'finished') // só processa uma vez
      .select('id')
      .single()

    if (matchError || !match) continue
    updatedMatches++

    // Calcula pontos para todos os picks deste jogo
    const { data: picks } = await supabase
      .from('picks')
      .select('id, home_score, away_score')
      .eq('match_id', match.id)

    if (!picks?.length) continue

    for (const pick of picks) {
      const points = calcPoints(
        { home_score: pick.home_score, away_score: pick.away_score },
        { home_score: game.home_score, away_score: game.away_score }
      )
      await supabase.from('picks').update({ points }).eq('id', pick.id)
      updatedPicks++
    }
  }

  if (updatedMatches > 0) {
    await Promise.all([
      cacheDel('matches:all', 'matches:bracket', 'leaderboard'),
      cacheDelPattern('picks:*'),
    ])
  }

  return NextResponse.json({ updatedMatches, updatedPicks })
}
