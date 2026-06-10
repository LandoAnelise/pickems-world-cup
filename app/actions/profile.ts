'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: name })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/perfil')
  revalidatePath('/', 'layout')
  return { success: true }
}
