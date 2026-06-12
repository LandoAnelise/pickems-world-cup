type LogLevel = 'debug' | 'info' | 'warn' | 'error'
type ResolvedLogLevel = LogLevel | 'silent'

const LOG_LEVEL_ORDER: Record<ResolvedLogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 50,
}

function resolveLogLevel(value: string | undefined): ResolvedLogLevel {
  switch (value?.toLowerCase()) {
    case 'debug':
    case 'info':
    case 'warn':
    case 'error':
    case 'silent':
      return value.toLowerCase() as ResolvedLogLevel
    default:
      return 'info'
  }
}

function getActiveLogLevel(): ResolvedLogLevel {
  return resolveLogLevel(process.env.LOG_LEVEL)
}

export function isLogLevelEnabled(level: LogLevel): boolean {
  return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[getActiveLogLevel()]
}

export function nowMs(): number {
  return globalThis.performance?.now?.() ?? Date.now()
}

export function log(level: LogLevel, event: string, fields: Record<string, unknown> = {}): void {
  if (!isLogLevelEnabled(level)) return

  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  }

  const line = JSON.stringify(payload)

  switch (level) {
    case 'debug':
    case 'info':
      console.log(line)
      return
    case 'warn':
      console.warn(line)
      return
    case 'error':
      console.error(line)
      return
  }
}

export function logPerf(
  component: string,
  op: string,
  durationMs: number,
  fields: Record<string, unknown> = {}
): void {
  log('debug', 'perf', {
    component,
    op,
    durationMs: Math.round(durationMs * 100) / 100,
    ...fields,
  })
}