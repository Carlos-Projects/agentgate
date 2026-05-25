// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class MemoryRateLimitStore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async check(_keys: any, _windowMs?: any, _maxRequests?: any): Promise<any> {
    return { allowed: true, remaining: 999, ttl: 0 }
  }
  async reset(_key: string): Promise<void> {}
  async close(): Promise<void> {}
}
