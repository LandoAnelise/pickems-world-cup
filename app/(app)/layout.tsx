import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/Navbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Cria perfil se o trigger não executou (comum no primeiro login com Google OAuth)
  if (!profile) {
    const baseUsername = (user.email?.split('@')[0] ?? user.id.slice(0, 8))
      .replace(/[^a-z0-9_]/gi, '_')
      .toLowerCase()
    const username = `${baseUsername}_${user.id.slice(0, 4)}`

    const displayName =
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      user.user_metadata?.display_name ??
      baseUsername

    const { data: created } = await supabase
      .from('profiles')
      .upsert({ id: user.id, username, display_name: displayName }, { onConflict: 'id' })
      .select('*')
      .single()

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
