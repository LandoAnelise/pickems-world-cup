'use client'

import { useActionState } from 'react'
import { toast } from 'sonner'
import { useEffect } from 'react'
import { updateDisplayName } from '@/app/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function PerfilForm({ currentName }: { currentName: string }) {
  const [state, action, pending] = useActionState(updateDisplayName, null)

  useEffect(() => {
    if (state?.success) toast.success('Apelido atualizado!')
    if (state?.error) toast.error(state.error)
  }, [state])

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
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Apelido</Label>
              <Input
                id="displayName"
                name="displayName"
                defaultValue={currentName}
                placeholder="Seu apelido no ranking"
                maxLength={10}
                autoFocus
              />
            </div>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? 'Salvando...' : 'Salvar apelido'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
