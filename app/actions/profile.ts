'use server'

import { revalidatePath } from 'next/cache'
import { getSupabaseWithUser } from '@/lib/supabase/auth'
import { cacheDel } from '@/lib/cache'

export async function getProfile() {
  const { supabase, user } = await getSupabaseWithUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  return data
}

export async function updateDisplayName(_: unknown, formData: FormData) {
  const name = (formData.get('displayName') as string).trim()

  if (!name) return { error: 'O apelido não pode ficar em branco.' }
  if (name.length > 10) return { error: 'O apelido deve ter no máximo 10 caracteres.' }

  const { supabase, user } = await getSupabaseWithUser()
  if (!user) return { error: 'Não autenticado.' }

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: name })
    .eq('id', user.id)

  if (error) return { error: error.message }

  await cacheDel(`profile:${user.id}`, 'leaderboard')
  revalidatePath('/perfil')
  revalidatePath('/', 'layout')
  return { success: true }
}
