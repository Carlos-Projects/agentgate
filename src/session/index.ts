import * as crypto from 'crypto'

export class SessionManager {
  constructor(_store: unknown, _config: unknown) {}
  async getOrCreateSession(_ip: string, _ua: string, _cookie?: string): Promise<{ session: { id: string }; isNew: boolean; isFallback: boolean; cookie?: string }> {
    return { session: { id: crypto.randomUUID() }, isNew: true, isFallback: false }
  }
  async updateSession(_id: string, _input: unknown): Promise<void> {}
  async close(): Promise<void> {}
}
