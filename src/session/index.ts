import * as crypto from 'crypto'
import { SessionPersistenceStore, AgentSession } from '../store/types'
import { SessionPolicy } from '../core/types'

export interface SessionResult {
  session: AgentSession
  isNew: boolean
  isFallback: boolean
}

export class SessionManager {
  private store: SessionPersistenceStore
  private config: SessionPolicy

  constructor(store: SessionPersistenceStore, config: SessionPolicy) {
    this.store = store
    this.config = config
  }

  async getOrCreateSession(ip: string, _ua: string, _cookie?: string): Promise<SessionResult> {
    const hashedIp = crypto.createHash('sha256').update(ip).digest('hex')

    if (_cookie) {
      const existing = await this.store.get(_cookie)
      if (existing && existing.ip === hashedIp) {
        existing.lastSeenAt = Date.now()
        existing.requestCount++
        await this.store.set(_cookie, existing)
        return { session: existing, isNew: false, isFallback: false }
      }
    }

    const id = crypto.randomUUID()
    const session: AgentSession = {
      id,
      ip: hashedIp,
      userAgent: _ua,
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
      requestCount: 1,
      score: 0,
    }
    await this.store.set(id, session)
    return { session, isNew: true, isFallback: !_cookie }
  }

  async updateSession(id: string, _input: unknown): Promise<void> {
    const existing = await this.store.get(id)
    if (!existing) return
    existing.lastSeenAt = Date.now()
    existing.requestCount++
    if (typeof _input === 'object' && _input !== null) {
      const input = _input as Record<string, unknown>
      if (typeof input.score === 'number') {
        existing.score = input.score
      }
    }
    await this.store.set(id, existing)
  }

  async close(): Promise<void> {
    await this.store.close()
  }
}
