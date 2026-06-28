'use server'

import { getSupabaseWithUser } from '@/lib/supabase/auth'
import { type BracketPicks } from '@/lib/types'

export async function saveBracketPicks(picks: BracketPicks): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await getSupabaseWithUser()
  if (!user) return { ok: false, error: 'Não autenticado' }

  const { error } = await supabase
    .from('bracket_picks')
    .upsert(
      { user_id: user.id, picks, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
