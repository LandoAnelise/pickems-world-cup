import { cache } from 'react'
import type { User } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { createClient } from './server'

export const getSupabaseWithUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabase, user }
})

export async function getCurrentUser(): Promise<User | null> {
  const { user } = await getSupabaseWithUser()
  return user
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()

  if (!user) redirect('/login')

  return user
}

export async function requireSupabaseUser() {
  const { supabase, user } = await getSupabaseWithUser()

  if (!user) redirect('/login')

  return { supabase, user }
}