'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { type MatchWithPick } from '@/lib/types'
import { MatchCard } from '@/components/MatchCard'

type Props = {
  groupName: string
  matches: MatchWithPick[]
  userId: string
  defaultOpen?: boolean
}

export function GroupSection({ groupName, matches, userId, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-3 hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        Grupo {groupName}
        <span className="text-xs font-normal ml-1">({matches.length} jogos)</span>
      </button>

      {open && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} userId={userId} />
          ))}
        </div>
      )}
    </div>
  )
}
