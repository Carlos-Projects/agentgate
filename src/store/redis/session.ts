export class RedisSessionStore {
  async get(_id: string): Promise<unknown> { return null }
  async set(_id: string, _data: unknown): Promise<void> {}
  async delete(_id: string): Promise<void> {}
  async close(): Promise<void> {}
}

