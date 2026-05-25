/**
 * In-Memory Session Store
 * TTL-based session storage for development/demo
 * 
 * WARNING: Sessions lost on restart. Use Redis for production.
 */

import { SessionStore, AgentSession } from '../types'

interface SessionRecord {
  session: AgentSession
  expiry: number
}

export class MemorySessionStore implements SessionStore {
  private store: Map<string, SessionRecord> = new Map()
  private cleanupInterval?: NodeJS.Timeout

  constructor() {
    this.startCleanup()
  }

  async get(sessionId: string): Promise<AgentSession | null> {
    const record = this.store.get(sessionId)
    if (!record) return null
    
    if (Date.now() > record.expiry) {
      this.store.delete(sessionId)
      return null
    }
    
    return record.session
  }

  async set(
    sessionId: string,
    session: AgentSession,
    ttlMs: number
  ): Promise<void> {
    this.store.set(sessionId, {
      session,
      expiry: Date.now() + ttlMs,
    })
  }

  async delete(sessionId: string): Promise<void> {
    this.store.delete(sessionId)
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      
      for (const [key, record] of this.store.entries()) {
        if (now > record.expiry) {
          this.store.delete(key)
        }
      }
    }, 30000)

    // Prevent blocking process exit in Node.js
    if (typeof this.cleanupInterval.unref === 'function') {
      this.cleanupInterval.unref()
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }
}
