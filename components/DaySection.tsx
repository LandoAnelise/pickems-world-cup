'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { type MatchWithPick } from '@/lib/types'
import { MatchCard } from '@/components/MatchCard'

type Props = {
  label: string
  matches: MatchWithPick[]
  userId: string
  defaultOpen?: boolean
}

export function DaySection({ label, matches, userId, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-3 hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {label}
        <span className="text-xs font-normal ml-1">({matches.length} {matches.length === 1 ? 'jogo' : 'jogos'})</span>
      </button>

      {open && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-2">
          {matches.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              userId={userId}
              groupLabel={m.group_name ? `Grupo ${m.group_name}` : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
