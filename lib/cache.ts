import { redis } from './redis'
import { logPerf, nowMs } from './logger'

function describeCacheKey(key: string): string {
  const [prefix, suffix] = key.split(':')

  if ((prefix === 'profile' || prefix === 'picks') && suffix) {
    return `${prefix}:*`
  }

  return key
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const startedAt = nowMs()
  const keyLabel = describeCacheKey(key)

  if (!redis) {
    logPerf('cache', 'get', nowMs() - startedAt, {
      key: keyLabel,
      status: 'redis-disabled',
    })
    return null
  }

  try {
    const val = await redis.get(key)
    logPerf('cache', 'get', nowMs() - startedAt, {
      key: keyLabel,
      status: val ? 'hit' : 'miss',
    })
    return val ? (JSON.parse(val) as T) : null
  } catch {
    logPerf('cache', 'get', nowMs() - startedAt, {
      key: keyLabel,
      status: 'error',
    })
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttl: number): Promise<void> {
  const startedAt = nowMs()
  const keyLabel = describeCacheKey(key)

  if (!redis) {
    logPerf('cache', 'set', nowMs() - startedAt, {
      key: keyLabel,
      ttl,
      status: 'redis-disabled',
    })
    return
  }

  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttl)
    logPerf('cache', 'set', nowMs() - startedAt, {
      key: keyLabel,
      ttl,
      status: 'ok',
    })
  } catch {
    logPerf('cache', 'set', nowMs() - startedAt, {
      key: keyLabel,
      ttl,
      status: 'error',
    })
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  const startedAt = nowMs()
  const keyLabels = keys.map(describeCacheKey)

  if (!redis || keys.length === 0) {
    logPerf('cache', 'del', nowMs() - startedAt, {
      keys: keyLabels,
      status: redis ? 'skipped' : 'redis-disabled',
    })
    return
  }

  try {
    await redis.del(...keys)
    logPerf('cache', 'del', nowMs() - startedAt, {
      keys: keyLabels,
      status: 'ok',
    })
  } catch {
    logPerf('cache', 'del', nowMs() - startedAt, {
      keys: keyLabels,
      status: 'error',
    })
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  const startedAt = nowMs()

  if (!redis) {
    logPerf('cache', 'del-pattern', nowMs() - startedAt, {
      pattern,
      status: 'redis-disabled',
    })
    return
  }

  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) await redis.del(...keys)
    logPerf('cache', 'del-pattern', nowMs() - startedAt, {
      pattern,
      deleted: keys.length,
      status: 'ok',
    })
  } catch {
    logPerf('cache', 'del-pattern', nowMs() - startedAt, {
      pattern,
      status: 'error',
    })
  }
}
