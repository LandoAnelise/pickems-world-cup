import { getProfile } from '@/app/actions/profile'
import { PerfilForm } from './PerfilForm'

export default async function PerfilPage() {
  const profile = await getProfile()
  return <PerfilForm currentName={profile?.display_name ?? ''} />
}
