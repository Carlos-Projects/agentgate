export const REDIS_NOT_SUPPORTED = true

export class RedisRateLimitStore {
  constructor() {
    throw new Error('Redis stores are not implemented yet. Use store: "memory" or integrate agentgate as middleware.')
  }
}

export class RedisSessionStore {
  constructor() {
    throw new Error('Redis stores are not implemented yet. Use store: "memory" or integrate agentgate as middleware.')
  }
}
