import { RateLimitStore, RateLimitCheckResult } from '../store/types'

export interface RateLimiterConfig {
  windowMs: number
  maxRequests: number
}

export class RateLimiter {
  private store: RateLimitStore
  private config: RateLimiterConfig

  constructor(store: RateLimitStore, config: RateLimiterConfig) {
    this.store = store
    this.config = config
  }

  async check(key: string | string[]): Promise<RateLimitCheckResult> {
    const keys = typeof key === 'string' ? [key] : key
    const result = await this.store.check(keys, this.config.windowMs, this.config.maxRequests)
    if (!result.limited) {
      await this.store.record(keys, this.config.windowMs)
    }
    return result
  }

  async close(): Promise<void> {
    await this.store.close()
  }
}
