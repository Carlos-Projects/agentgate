/**
 * Redis Session Store (Upstash)
 * TTL-based session storage for production
 */

import { SessionStore, AgentSession } from '../types'

interface RedisConfig {
  url: string
  token: string
  key_prefix?: string
}

interface UpstashRedis {
  Redis: new (config: { url: string; token: string }) => {
    get: <T>(key: string) => Promise<T | null>
    set: (key: string, value: string, options?: { ex: number }) => Promise<void>
    del: (key: string) => Promise<void>
  }
}

export async function createRedisSessionStore(
  config: RedisConfig
): Promise<SessionStore> {
  // Dynamic import for optional dependency
  let mod: UpstashRedis | null = null
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

  const Redis = mod.Redis
  const redis = new Redis({ url: config.url, token: config.token })
  const prefix = config.key_prefix || 'agentgate'

  return {
    async get(sessionId: string): Promise<AgentSession | null> {
      const redisKey = `${prefix}:session:${sessionId}`
      const data = await redis.get<string>(redisKey)
      if (!data) return null
      
      try {
        return JSON.parse(data) as AgentSession
      } catch {
        return null
      }
    },

    async set(
      sessionId: string,
      session: AgentSession,
      ttlMs: number
    ): Promise<void> {
      const redisKey = `${prefix}:session:${sessionId}`
      const ttlSeconds = Math.ceil(ttlMs / 1000)
      
      await redis.set(redisKey, JSON.stringify(session), { ex: ttlSeconds })
    },

    async delete(sessionId: string): Promise<void> {
      const redisKey = `${prefix}:session:${sessionId}`
      await redis.del(redisKey)
    },
  }
}
