/**
 * Redis Rate Limit Store (Upstash)
 * Sliding window implementation using sorted sets
 * Production-ready for serverless/edge environments
 */

import { RateLimitStore, RateLimitCheckResult } from '../types'

interface RedisConfig {
  url: string
  token: string
  key_prefix?: string
}

export async function createRedisRateLimitStore(
  config: RedisConfig
): Promise<RateLimitStore> {
  // Dynamic import for optional dependency
  let mod: any = null
  try {
    mod = await import('@upstash/redis' as any).catch(() => null)
  } catch {
    // Ignore import errors
  }
  
  if (!mod) {
    throw new Error(
      "Redis store requires '@upstash/redis'. Install: npm install @upstash/redis"
    )
  }

  const { Redis } = mod
  const redis = new Redis({ url: config.url, token: config.token })
  const prefix = config.key_prefix || 'agentgate'

  return {
    async check(
      keys: string[],
      windowMs: number,
      maxRequests: number
    ): Promise<RateLimitCheckResult> {
      const now = Date.now()
      const windowStart = now - windowMs
      let worstRemaining = maxRequests
      let worstResetAt = now + windowMs
      let worstLimited = false

      const pipeline = redis.pipeline()

      for (const key of keys) {
        const redisKey = `${prefix}:rl:${key}`
        // Remove entries outside the window
        pipeline.zremrangebyscore(redisKey, 0, windowStart)
        // Count entries in the window
        pipeline.zcard(redisKey)
        // Get oldest entry for reset time
        pipeline.zrange(redisKey, 0, 0, { rev: false })
      }

      const results: any[] = await pipeline.exec()

      for (let i = 0; i < keys.length; i++) {
        const count = results[i * 3 + 1] as number
        const oldestEntries = results[i * 3 + 2] as string[]
        
        const remaining = Math.max(0, maxRequests - count)
        const resetAt = oldestEntries.length > 0
          ? parseInt(oldestEntries[0]) + windowMs
          : now + windowMs

        if (count >= maxRequests) {
          worstLimited = true
        }

        if (remaining < worstRemaining) {
          worstRemaining = remaining
          worstResetAt = resetAt
        }
      }

      return { limited: worstLimited, remaining: worstRemaining, resetAt: worstResetAt }
    },

    async record(keys: string[], windowMs: number): Promise<void> {
      const now = Date.now()
      const pipeline = redis.pipeline()

      for (const key of keys) {
        const redisKey = `${prefix}:rl:${key}`
        // Use unique ID to avoid collisions
        const requestId = `${now}-${Math.random().toString(36).slice(2)}`
        pipeline.zadd(redisKey, { score: now, member: requestId })
        pipeline.pexpire(redisKey, windowMs)
      }

      await pipeline.exec()
    },

    async reset(key: string): Promise<void> {
      const redisKey = `${prefix}:rl:${key}`
      await redis.del(redisKey)
    },
  }
}
