/**
 * Webhook Types
 */

export type WebhookEvent =
  | 'honeypot_hit'
  | 'critical_score'
  | 'blocked'
  | 'rate_limit_exceeded'
  | 'session_violation'

export interface WebhookTarget {
  name: string
  url: string
  events: WebhookEvent[]
  secret?: string
  timeout_ms?: number
}

export interface WebhookConfig {
  enabled: boolean
  targets: WebhookTarget[]
}

export interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  data: {
    ip: string
    path: string
    userAgent: string
    score: number
    action: AgentGateAction
    signals: SignalType[]
    sessionId?: string
  }
}

// Re-export from core types
export type { AgentGateAction, SignalType } from '../core/types'
