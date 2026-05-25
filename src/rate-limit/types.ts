/**
 * Rate Limit Types
 */

export interface RateLimitRule {
  window_ms: number
  max_requests: number
  action: AgentGateAction
}

export interface RateLimitConfig {
  enabled: boolean
  store: 'memory' | 'redis'
  key_prefix?: string
  failure_mode: 'open' | 'challenge' | 'block'
  rules: {
    default: RateLimitRule
    suspected_agent: RateLimitRule
    honeypot_hit: RateLimitRule
    paths?: Record<string, RateLimitRule>
  }
}

export interface RateLimitResult {
  limited: boolean
  remaining: number
  resetAt: number
  total: number
}

// Re-export from core types
export type { AgentGateAction, SignalType } from '../core/types'
