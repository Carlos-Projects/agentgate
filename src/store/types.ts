export interface RateLimitCheckResult { allowed: boolean; limited: boolean; remaining: number; resetAt: number; total: number }

export interface RateLimitStore {
  check(keys: string[], windowMs: number, maxRequests: number): Promise<RateLimitCheckResult>
  record(keys: string[], windowMs: number): Promise<void>
  close(): Promise<void>
}

export interface AgentSession {
  id: string; ip: string; userAgent: string; createdAt: number; lastSeenAt: number; requestCount: number; score: number
}
