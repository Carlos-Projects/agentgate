/**
 * Session Types
 */

import { AgentGateAction, SignalType } from '../core/types'
import { AgentSession as StoreAgentSession } from '../store/types'

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
  session: StoreAgentSession
  cookie?: string
  isNew: boolean
  isFallback: boolean
}

export type { StoreAgentSession as AgentSession }
