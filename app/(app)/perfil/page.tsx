'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function PerfilPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Carrega o perfil atual ao montar
  if (!loaded) {
    setLoaded(true)
    createClient()
      .from('profiles')
      .select('display_name')
      .single()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name)
      })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const name = displayName.trim()
    if (!name) {
      toast.error('O apelido não pode ficar em branco.')
      return
    }
    if (name.length > 10) {
      toast.error('O apelido deve ter no máximo 10 caracteres.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: name })
      .eq('id', user!.id)
    if (error) {
      toast.error('Erro ao salvar: ' + error.message)
    } else {
      toast.success('Apelido atualizado!')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle>Meu Perfil</CardTitle>
          <CardDescription>
            Este é o nome que aparece no ranking para seus amigos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Apelido</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Seu apelido no ranking"
                maxLength={10}
                autoFocus
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Salvando...' : 'Salvar apelido'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
