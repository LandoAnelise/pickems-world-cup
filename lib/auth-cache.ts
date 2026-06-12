import { cacheGet, cacheSet } from './cache'
import type { AuthUser } from './supabase/forwarded-user'

const AUTH_CACHE_PREFIX = 'auth'
const AUTH_CACHE_TTL_SECONDS = 60
const SUPABASE_AUTH_COOKIE_MARKERS = ['sb-', 'supabase']

function isAuthCookieName(name: string): boolean {
  const normalized = name.toLowerCase()
  return SUPABASE_AUTH_COOKIE_MARKERS.some((marker) => normalized.includes(marker))
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function getAuthCookieSignature(
  cookies: Array<{ name: string; value: string }>
): Promise<string | null> {
  const relevantCookies = cookies
    .filter((cookie) => isAuthCookieName(cookie.name))
    .sort((left, right) => left.name.localeCompare(right.name))

  if (relevantCookies.length === 0) return null

  const encoder = new TextEncoder()
  const payload = relevantCookies.map(({ name, value }) => `${name}=${value}`).join('|')
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(payload))

  return `${AUTH_CACHE_PREFIX}:${toHex(digest)}`
}

export async function getCachedValidatedUser(cacheKey: string): Promise<AuthUser | null> {
  return cacheGet<AuthUser>(cacheKey)
}

export async function setCachedValidatedUser(cacheKey: string, user: AuthUser): Promise<void> {
  await cacheSet(cacheKey, user, AUTH_CACHE_TTL_SECONDS)
}