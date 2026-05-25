import { RateLimitStore } from '../types'

export class MemoryRateLimitStore implements RateLimitStore {
  async check(_keys: string[], _windowMs: number, _maxRequests: number): Promise<{ allowed: boolean; limited: boolean; remaining: number; resetAt: number; total: number }> {
    return { allowed: true, limited: false, remaining: 999, resetAt: Date.now() + 60000, total: 0 }
  }
  async record(_keys: string[], _windowMs: number): Promise<void> {}
  async close(): Promise<void> {}
}
