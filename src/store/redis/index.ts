export class RedisRateLimitStore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async check(_keys: any, _windowMs?: any, _maxRequests?: any): Promise<any> {
    return { allowed: true, limited: false, remaining: 999, resetAt: Date.now() + 60000, total: 0 }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async record(_keys: any, _windowMs?: any): Promise<void> {}
  async close(): Promise<void> {}
}

export class RedisSessionStore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async get(_id: string): Promise<any> { return null }
  async set(_id: string, _data: unknown): Promise<void> {}
  async delete(_id: string): Promise<void> {}
  async close(): Promise<void> {}
}
