import { RateLimitStore, RateLimitCheckResult } from '../store/types'

export interface RateLimiterConfig {
  windowMs: number
  maxRequests: number
}

const MAX_KEY_LENGTH = 128
const KEY_SANITIZE_RE = /[^a-zA-Z0-9:_\-./@]/g

function sanitizeKey(key: string): string {
  return key.replace(KEY_SANITIZE_RE, '_').slice(0, MAX_KEY_LENGTH)
}

export class RateLimiter {
  private store: RateLimitStore
  private config: RateLimiterConfig

  constructor(store: RateLimitStore, config: RateLimiterConfig) {
    this.store = store
    this.config = config
  }

  async check(key: string | string[]): Promise<RateLimitCheckResult> {
    const keys = (typeof key === 'string' ? [key] : key).map(k =>
      k.split(',').map(part => sanitizeKey(part.trim())).filter(Boolean)
    ).flat()
    if (keys.length === 0) {
      return { allowed: true, limited: false, remaining: 999, resetAt: Date.now() + this.config.windowMs, total: 0 }
    }
    await this.store.record(keys, this.config.windowMs)
    return this.store.check(keys, this.config.windowMs, this.config.maxRequests)
  }

  async close(): Promise<void> {
    await this.store.close()
  }
}
