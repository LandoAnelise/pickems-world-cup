import { cache } from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { logPerf, nowMs } from '@/lib/logger'
import { readForwardedUserHeaders, toAuthUser, type AuthUser } from '@/lib/supabase/forwarded-user'
import { createClient } from './server'

export const getSupabaseWithUser = cache(async () => {
  const startedAt = nowMs()
  const [supabase, headerStore] = await Promise.all([createClient(), headers()])
  const forwardedUser = readForwardedUserHeaders(headerStore)

  if (forwardedUser) {
    logPerf('auth', 'getSupabaseWithUser', nowMs() - startedAt, {
      authenticated: true,
      source: 'forwarded',
    })

    return { supabase, user: forwardedUser }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  logPerf('auth', 'getSupabaseWithUser', nowMs() - startedAt, {
    authenticated: Boolean(user),
    source: 'supabase',
  })

  return { supabase, user: user ? toAuthUser(user) : null }
})

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { user } = await getSupabaseWithUser()
  return user
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
    throw new Error('unreachable')
  }

  return user
}

export async function requireSupabaseUser() {
  const { supabase, user } = await getSupabaseWithUser()

  if (!user) redirect('/login')

  return { supabase, user }
}