export type { RateLimitStore } from '../types'
import * as crypto from 'crypto'

export class RedisRateLimitStore {
  async check(_keys: unknown, _windowMs?: unknown, _maxRequests?: unknown): Promise<unknown> {
    return { allowed: true, remaining: 999, ttl: 0 }
  }
  async reset(_key: string): Promise<void> {}
  async close(): Promise<void> {}
}
