import { RateLimitStore, SessionPersistenceStore, AgentSession } from '../types'

export class MemoryRateLimitStore implements RateLimitStore {
  async check(_keys: string[], _windowMs: number, _maxRequests: number): Promise<{ allowed: boolean; limited: boolean; remaining: number; resetAt: number; total: number }> {
    return { allowed: true, limited: false, remaining: 999, resetAt: Date.now() + 60000, total: 0 }
  }
  async record(_keys: string[], _windowMs: number): Promise<void> {}
  async close(): Promise<void> {}
}

export class MemorySessionStore implements SessionPersistenceStore {
  private sessions = new Map<string, AgentSession>()
  private maxSessions: number
  private defaultTtl: number
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(maxSessions: number = 10000, defaultTtlMs: number = 3600000) {
    this.maxSessions = maxSessions
    this.defaultTtl = defaultTtlMs
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000)
    this.cleanupInterval.unref?.()
  }

  async get(id: string): Promise<AgentSession | null> {
    return this.sessions.get(id) ?? null
  }

  async set(id: string, data: AgentSession): Promise<void> {
    if (!this.sessions.has(id) && this.sessions.size >= this.maxSessions) {
      const oldest = this.sessions.entries().next().value
      if (oldest) {
        this.sessions.delete(oldest[0])
      }
    }
    this.sessions.set(id, data)
  }

  async delete(id: string): Promise<void> {
    this.sessions.delete(id)
  }

  cleanup(): void {
    const now = Date.now()
    for (const [id, session] of this.sessions) {
      if (now - session.lastSeenAt > this.defaultTtl) {
        this.sessions.delete(id)
      }
    }
  }

  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.sessions.clear()
  }
}
