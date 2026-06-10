'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const TABS = [
  { key: 'upcoming', label: 'Próximos' },
  { key: 'finished', label: 'Concluídos' },
  { key: 'all', label: 'Todos' },
] as const

export function PicksFilterTabs() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = searchParams.get('filter') ?? 'upcoming'

  function setFilter(key: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('filter', key)
    router.push(`/?${params.toString()}`)
  }

  return (
    <div className="flex gap-1 border-b mb-6">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setFilter(tab.key)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            current === tab.key
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
