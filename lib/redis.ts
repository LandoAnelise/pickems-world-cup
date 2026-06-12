import Redis from 'ioredis'
import { log } from './logger'

declare global {
  var _redis: Redis | null | undefined
}

function createRedis(): Redis | null {
  const url = process.env.REDIS_URL

  if (!url) {
    log('debug', 'redis', {
      component: 'redis',
      op: 'init',
      status: 'disabled',
    })
    return null
  }

  try {
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: false,
    })

    log('debug', 'redis', {
      component: 'redis',
      op: 'init',
      status: 'configured',
    })

    return client
  } catch (error) {
    log('error', 'redis', {
      component: 'redis',
      op: 'init',
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
    })

    throw error
  }
}

export const redis: Redis | null =
  global._redis !== undefined ? global._redis : (global._redis = createRedis())
