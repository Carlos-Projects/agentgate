import * as crypto from 'crypto'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class SessionManager {
  constructor(_store: any, _config: any) {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getOrCreateSession(_ip: string, _ua: string, _cookie?: string): Promise<any> {
    return { session: { id: crypto.randomUUID(), ip: _ip, userAgent: _ua, firstSeen: Date.now(), lastSeen: Date.now() }, isNew: true, isFallback: false }
  }
  async updateSession(_id: string, _input: unknown): Promise<void> {}
  async close(): Promise<void> {}
}
