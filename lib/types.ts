export type Profile = {
  id: string
  username: string
  display_name: string | null
  is_admin: boolean
  created_at: string
}

export type Match = {
  id: string
  external_id: string | null
  stage: string
  group_name: string | null
  home_team: string
  away_team: string
  match_date: string
  home_score: number | null
  away_score: number | null
  status: 'scheduled' | 'live' | 'finished'
}

export type Pick = {
  id: string
  user_id: string
  match_id: string
  home_score: number
  away_score: number
  points: number | null
  created_at: string
}

export type MatchWithPick = Match & { pick?: Pick }

export type BracketPicks = {
  r32: (string | null)[]
  r16: (string | null)[]
  qf: (string | null)[]
  sf: (string | null)[]
  final: string | null
}

export type LeaderboardEntry = {
  user_id: string
  username: string
  display_name: string | null
  total_points: number
  picks_count: number
  exact_scores: number
  correct_winners: number
}
