import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cacheGet, cacheSet } from '@/lib/cache'
import { type Profile } from '@/lib/types'
import { Navbar } from '@/components/Navbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let profile = await cacheGet<Profile>(`profile:${user.id}`)
  if (!profile) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = data
    if (profile) await cacheSet(`profile:${user.id}`, profile, 300)
  }

  // Cria perfil se não existir (trigger pode não ter rodado no OAuth)
  if (!profile) {
    const baseUsername = (user.email?.split('@')[0] ?? user.id.slice(0, 8))
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
    const username = `${baseUsername}_${user.id.slice(0, 4)}`
    const displayName =
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      user.user_metadata?.display_name ??
      baseUsername

    // Admin client bypassa RLS para garantir a criação
    const admin = createAdminClient()
    const { data: created, error } = await admin
      .from('profiles')
      .upsert({ id: user.id, username, display_name: displayName }, { onConflict: 'id' })
      .select('*')
      .single()

    if (error) console.error('[layout] profile create error:', error.message)
    if (!created) redirect('/login')
    profile = created
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar profile={profile} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
