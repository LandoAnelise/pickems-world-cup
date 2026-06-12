'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { type Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'

export function Navbar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const links = [
    { href: '/', label: 'Palpites' },
    { href: '/chaveamento', label: 'Chaveamento' },
    { href: '/leaderboard', label: 'Ranking' },
    ...(profile.is_admin ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  const linkClass = (href: string) =>
    `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      pathname === href
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
    }`

  return (
    <header className="sticky top-0 z-50 bg-background border-b">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
        <span className="font-bold text-base shrink-0">⚽ Copa 2026</span>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1 flex-1">
          {links.map((link) => (
            <Link key={link.href} href={link.href} prefetch={false} className={linkClass(link.href)}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden sm:flex items-center gap-3 ml-auto">
          <Link href="/perfil" prefetch={false} className="text-sm text-muted-foreground hover:text-foreground transition-colors truncate max-w-[120px]" title="Editar apelido">
            {profile.display_name ?? profile.username}
          </Link>
          <form action={signOut}><Button variant="outline" size="sm" type="submit">Sair</Button></form>
        </div>

        {/* Mobile: apelido + hambúrguer */}
        <div className="sm:hidden flex items-center gap-2 ml-auto">
          <Link href="/perfil" prefetch={false} className="text-xs text-muted-foreground truncate max-w-[80px]">
            {profile.display_name ?? profile.username}
          </Link>
          <button onClick={() => setOpen((o) => !o)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="sm:hidden border-t bg-background px-4 py-2 space-y-1">
          {links.map((link) => (
            <Link key={link.href} href={link.href} prefetch={false} className={linkClass(link.href)} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          <div className="pt-1 border-t mt-1">
            <form action={signOut}><Button variant="outline" size="sm" className="w-full" type="submit">Sair</Button></form>
          </div>
        </div>
      )}
    </header>
  )
}
