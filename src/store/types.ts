export type RateLimitStore = unknown
export type AgentSession = { id: string; ip: string; userAgent: string; createdAt: number; lastSeenAt: number; requestCount: number; score: number }
