import Redis from 'ioredis'

declare global {
  var _redis: Redis | null | undefined
}

function createRedis(): Redis | null {
  const url = process.env.REDIS_URL
  if (!url) return null
  return new Redis(url, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: false,
  })
}

export const redis: Redis | null =
  global._redis !== undefined ? global._redis : (global._redis = createRedis())
