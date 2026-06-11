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
  stadium_id: string
  finished: string
  time_elapsed: string
}

// Mapeamento stadium_id → offset UTC (torneio em junho/julho 2026)
// México aboliu DST em 2023: permanentemente em UTC-6 (CST)
// México: Mexico City=1, Guadalajara=2, Monterrey=3
// EUA Central (CDT = UTC-5): Dallas=4, Houston=5, Kansas City=6
// EUA/CAN Eastern (EDT = UTC-4): Atlanta=7, Miami=8, Boston=9, Philadelphia=10, New York/NJ=11, Toronto=12
// EUA/CAN Western (PDT = UTC-7): Vancouver=13, Seattle=14, San Francisco=15, Los Angeles=16
const STADIUM_OFFSET: Record<string, string> = {
  '1': '-06:00', '2': '-06:00', '3': '-06:00',
  '4': '-05:00', '5': '-05:00', '6': '-05:00',
  '7': '-04:00', '8': '-04:00', '9': '-04:00',
  '10': '-04:00', '11': '-04:00', '12': '-04:00',
  '13': '-07:00', '14': '-07:00', '15': '-07:00', '16': '-07:00',
}

function parseMatchDate(localDate: string, stadiumId: string): string {
  const offset = STADIUM_OFFSET[stadiumId] ?? '-05:00'
  const [datePart, timePart] = localDate.split(' ')
  const [month, day, year] = datePart.split('/')
  return new Date(`${year}-${month}-${day}T${timePart}:00${offset}`).toISOString()
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
    match_date: parseMatchDate(g.local_date, g.stadium_id),
    finished: g.finished === 'TRUE',
    status: parseStatus(g),
  }))
}
