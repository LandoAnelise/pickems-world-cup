import { redis } from './redis'

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null
  try {
    const val = await redis.get(key)
    return val ? (JSON.parse(val) as T) : null
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttl: number): Promise<void> {
  if (!redis) return
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttl)
  } catch {}
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (!redis || keys.length === 0) return
  try {
    await redis.del(...keys)
  } catch {}
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  if (!redis) return
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) await redis.del(...keys)
  } catch {}
}
