/**
 * Session Types
 */

export interface SessionConfig {
  enabled: boolean
  ttl_ms: number
  fallback_ttl_ms: number
  cookie_name: string
  cookie_secure: boolean
  cookie_same_site: 'Lax' | 'Strict' | 'None'
  track_paths: boolean
  max_paths: number
}

export interface SessionUpdateInput {
  path: string
  score: number
  action: AgentGateAction
  signals: SignalType[]
}

export interface SessionResult {
  session: AgentSession
  cookie?: string
  isNew: boolean
  isFallback: boolean
}

// Re-export from store types
export type { AgentSession } from '../store/types'
export type { AgentGateAction, SignalType } from '../core/types'
