import { RateLimitStore } from '../store/types'

export class RateLimiter {
  constructor(_store: RateLimitStore, _config: unknown) {}
  async check(_key: unknown): Promise<unknown> {
    return { allowed: true, remaining: 999, ttl: 0 }
  }
  async close(): Promise<void> {}
}

export async function createRedisRateLimitStore(): Promise<never> {
  throw new Error('Redis store requires optional dependency')
}
