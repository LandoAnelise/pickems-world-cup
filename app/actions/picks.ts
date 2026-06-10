'use server'

import { createClient } from '@/lib/supabase/server'
import { cacheDel } from '@/lib/cache'

export async function savePick(matchId: string, homeScore: number, awayScore: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { error } = await supabase.from('picks').upsert(
    { user_id: user.id, match_id: matchId, home_score: homeScore, away_score: awayScore },
    { onConflict: 'user_id,match_id' }
  )

  if (error) return { error: error.message }

  await cacheDel(`picks:${user.id}`, 'leaderboard')
  return { success: true }
}
