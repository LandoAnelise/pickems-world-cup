export type WCGame = {
  id: string
  home_team: string
  away_team: string
  home_score: number
  away_score: number
  group: string
  type: string
  match_date: string // ISO string
  finished: boolean
  status: 'scheduled' | 'live' | 'finished'
}

type RawGame = {
  id: string
  home_team_name_en: string
  away_team_name_en: string
  home_score: string
  away_score: string
  group: string
  type: string
  local_date: string
  finished: string
  time_elapsed: string
}

// Datas no formato "MM/DD/YYYY HH:MM" — tratadas como horário do leste dos EUA (EDT, UTC-4)
// A maioria dos jogos é nos EUA. Ajuste o offset se necessário.
function parseMatchDate(localDate: string): string {
  const [datePart, timePart] = localDate.split(' ')
  const [month, day, year] = datePart.split('/')
  return new Date(`${year}-${month}-${day}T${timePart}:00-04:00`).toISOString()
}

function parseStatus(game: RawGame): 'scheduled' | 'live' | 'finished' {
  if (game.finished === 'TRUE') return 'finished'
  if (game.time_elapsed !== 'notstarted') return 'live'
  return 'scheduled'
}

export async function fetchAllGames(): Promise<WCGame[]> {
  const res = await fetch('https://worldcup26.ir/get/games', { cache: 'no-store' })
  if (!res.ok) throw new Error(`worldcup26.ir API error: ${res.status}`)
  const data: { games: RawGame[] } = await res.json()
  return data.games.map((g) => ({
    id: g.id,
    home_team: g.home_team_name_en,
    away_team: g.away_team_name_en,
    home_score: parseInt(g.home_score, 10),
    away_score: parseInt(g.away_score, 10),
    group: g.group,
    type: g.type,
    match_date: parseMatchDate(g.local_date),
    finished: g.finished === 'TRUE',
    status: parseStatus(g),
  }))
}
