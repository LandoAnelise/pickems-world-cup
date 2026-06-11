import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { fetchAllGames } from '@/lib/worldcup-api'

export async function POST(request: Request) {
  if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const games = await fetchAllGames()

  // Importa apenas jogos com times já definidos (fases eliminatórias podem ter TBD)
  const readyGames = games.filter((g) => g.home_team && g.away_team)

  const { error, count } = await supabase.from('matches').upsert(
    readyGames.map((g) => ({
      external_id: g.id,
      stage: g.type,
      group_name: g.group,
      home_team: g.home_team,
      away_team: g.away_team,
      match_date: g.match_date,
    })),
    { onConflict: 'external_id', ignoreDuplicates: false, count: 'exact' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ imported: games.length, inserted: count })
}
