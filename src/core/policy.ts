/**
 * Policy Engine
 * Loads and validates agent policies
 */

import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import {
  AgentPolicy,
  DEFAULT_POLICY,
  AgentGateAction,
  ScoringConfig,
  DEFAULT_SCORING_CONFIG,
} from './types'

function stripProto(v: unknown): unknown {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return v
  const clean: Record<string, unknown> = Object.create(null)
  for (const key of Object.keys(v as Record<string, unknown>)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue
    clean[key] = stripProto((v as Record<string, unknown>)[key])
  }
  return clean
}

export interface PolicyValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validatePolicy(policy: AgentPolicy): PolicyValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Rate limit validation
  if (policy.rate_limit?.enabled) {
    if (policy.rate_limit.store === 'redis') {
      if (!process.env.AGENTGATE_REDIS_URL || !process.env.AGENTGATE_REDIS_TOKEN) {
        errors.push(
          'Redis store requires AGENTGATE_REDIS_URL and AGENTGATE_REDIS_TOKEN environment variables'
        )
      }
    }

    if (!policy.rate_limit.rules?.default) {
      errors.push('Rate limit enabled but no default rule defined')
    }
  }

  // Dashboard auth validation
  if (policy.dashboard?.require_auth) {
    if (!process.env.AGENTGATE_DASHBOARD_TOKEN) {
      errors.push(
        'Dashboard auth enabled but AGENTGATE_DASHBOARD_TOKEN environment variable not set'
      )
    }
  }

  // Webhooks validation
  if (policy.webhooks?.enabled) {
    if (!policy.webhooks.targets || policy.webhooks.targets.length === 0) {
      errors.push('Webhooks enabled but no targets defined')
    }

    for (const target of policy.webhooks.targets || []) {
      if (!target.url) {
        errors.push(`Webhook target "${target.name}" has no URL`)
      }
      if (!target.events || target.events.length === 0) {
        warnings.push(`Webhook target "${target.name}" has no events configured`)
      }
    }
  }

  // Scoring thresholds validation
  if (policy.scoring?.thresholds) {
    const t = policy.scoring.thresholds
    const thresholds = [
      t.allow ?? 0,
      t.limited ?? 30,
      t.challenge ?? 55,
      t.sandbox ?? 70,
      t.block ?? 90,
    ]
    
    for (let i = 1; i < thresholds.length; i++) {
      if (thresholds[i - 1] > thresholds[i]) {
        errors.push('Scoring thresholds must be in ascending order')
        break
      }
    }
  }

  // Session validation
  if (policy.session?.enabled) {
    if (policy.session.ttl_ms < 60000) {
      warnings.push('Session TTL < 60s may cause issues with legitimate users')
    }
    if (policy.session.ttl_ms > 86400000) {
      warnings.push('Session TTL > 24h is unusually long and may increase security risks')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

export function loadPolicy(configPath: string, allowedBase?: string): AgentPolicy {
  try {
    const resolved = path.resolve(configPath)
    if (allowedBase) {
      const relative = path.relative(allowedBase, resolved)
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        console.warn('Path traversal detected in policy path, using defaults')
        return DEFAULT_POLICY
      }
    }
    const content = fs.readFileSync(configPath, 'utf-8')
    const raw = yaml.load(content, { schema: yaml.JSON_SCHEMA }) as Record<string, unknown>
    const parsed = stripProto(raw) as Partial<AgentPolicy>
    return mergePolicy(parsed)
  } catch (error) {
    console.warn(`Failed to load policy from ${configPath}, using defaults`)
    return DEFAULT_POLICY
  }
}

export function loadPolicyFromString(yamlContent: string): AgentPolicy {
  try {
    const raw = yaml.load(yamlContent, { schema: yaml.JSON_SCHEMA }) as Record<string, unknown>
    const parsed = stripProto(raw) as Partial<AgentPolicy>
    return mergePolicy(parsed)
  } catch (error) {
    console.warn('Failed to parse policy YAML, using defaults')
    return DEFAULT_POLICY
  }
}

function mergePolicy(partial: Partial<AgentPolicy>): AgentPolicy {
  return {
    mode: partial.mode || DEFAULT_POLICY.mode,
    defaults: {
      action: partial.defaults?.action || DEFAULT_POLICY.defaults.action,
      expose_debug_headers:
        partial.defaults?.expose_debug_headers ??
        DEFAULT_POLICY.defaults.expose_debug_headers,
    },
    approved_agents: partial.approved_agents || DEFAULT_POLICY.approved_agents,
    known_ai_agents: partial.known_ai_agents || DEFAULT_POLICY.known_ai_agents,
    paths: partial.paths || DEFAULT_POLICY.paths,
    scoring: partial.scoring,
    honeypots: partial.honeypots || DEFAULT_POLICY.honeypots,
    privacy: partial.privacy || DEFAULT_POLICY.privacy,
    rate_limit: partial.rate_limit,
    session: partial.session,
    dashboard: partial.dashboard,
    webhooks: partial.webhooks,
  }
}

export function getActionForPath(
  path: string,
  policy: AgentPolicy
): AgentGateAction | null {
  for (const [pattern, config] of Object.entries(policy.paths)) {
    if (matchPath(path, pattern)) {
      return config.action
    }
  }
  return null
}

export function getActionForAgent(
  userAgent: string,
  policy: AgentPolicy
): AgentGateAction | null {
  for (const agent of policy.approved_agents) {
    if (userAgent.includes(agent.name)) {
      return agent.action
    }
  }
  return null
}

function matchPath(path: string, pattern: string): boolean {
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -1)
    return path.startsWith(prefix)
  }
  return path === pattern
}

export function getScoringConfig(policy: AgentPolicy): ScoringConfig {
  const cleanScoring = policy.scoring ? stripProto(policy.scoring) as Partial<ScoringConfig> : {}
  const userWeights = cleanScoring && 'weights' in cleanScoring && cleanScoring.weights
    ? Object.fromEntries(
        Object.entries(cleanScoring.weights as Record<string, number>)
          .filter(([k]) => !['__proto__', 'constructor', 'prototype'].includes(k))
      )
    : {}
  const userThresholds = cleanScoring && 'thresholds' in cleanScoring && cleanScoring.thresholds
    ? Object.fromEntries(
        Object.entries(cleanScoring.thresholds as Record<string, number>)
          .filter(([k]) => !['__proto__', 'constructor', 'prototype'].includes(k))
      )
    : {}
  return {
    ...DEFAULT_SCORING_CONFIG,
    ...cleanScoring,
    weights: { ...DEFAULT_SCORING_CONFIG.weights, ...userWeights },
    thresholds: { ...DEFAULT_SCORING_CONFIG.thresholds, ...userThresholds },
  }
}
