/**
 * Store Interfaces
 * Runtime-agnostic storage abstractions
 */

import { AgentGateAction, SignalType } from '../core/types'

export interface RateLimitCheckResult {
  limited: boolean
  remaining: number
  resetAt: number
}

export interface RateLimitStore {
  /**
   * Check rate limit status for multiple keys
   * Returns the worst result across all keys
   */
  check(
    keys: string[],
    windowMs: number,
    maxRequests: number
  ): Promise<RateLimitCheckResult>

  /**
   * Record a request for all keys
   */
  record(
    keys: string[],
    windowMs: number
  ): Promise<void>

  /**
   * Reset rate limit for a key
   */
  reset(key: string): Promise<void>
}

export interface SessionStore {
  /**
   * Get session by ID
   */
  get(sessionId: string): Promise<AgentSession | null>

  /**
   * Set session with TTL
   */
  set(
    sessionId: string,
    session: AgentSession,
    ttlMs: number
  ): Promise<void>

  /**
   * Delete session
   */
  delete(sessionId: string): Promise<void>
}

export interface AgentSession {
  id: string
  firstSeen: string
  lastSeen: string
  ipHash: string
  userAgentHash: string
  fingerprint?: string
  requestCount: number
  paths: string[]
  honeypotHits: number
  cumulativeScore: number
  lastAction?: AgentGateAction
  signals: SignalType[]
}

// Re-export from core types
export type { Logger } from '../core/types'
