/**
 * Signal Detection Engine
 * Extracts and identifies signals from request context
 */

import { RequestContext, Signal, SignalType, AgentPolicy } from './types';

// In-memory rate tracking per IP
const rateBuckets = new Map<string, { count: number; windowStart: number }>()
const RATE_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT = 60 // requests per minute

const KNOWN_AI_AGENTS_DEFAULT = [
  'GPTBot',
  'ChatGPT-User',
  'ClaudeBot',
  'PerplexityBot',
  'CCBot',
  'Applebot-Extended',
  'Google-Extended',
  'anthropic-ai',
  'cohere-ai',
];

const DATACENTER_ASN_RANGES = [
  'AWS', 'GCP', 'AZURE', 'ORACLE', 'DIGITALOCEAN', 'LINODE', 'OVH',
  'HETZNER', 'SCALEWAY', 'VULTR',
]

const SUSPICIOUS_PATTERNS = [
  /bot/i, /crawler/i, /spider/i, /scraper/i, /curl/i, /wget/i, /python/i, /httpclient/i,
]

export function detectSignals(
  context: RequestContext,
  policy: AgentPolicy
): Signal[] {
  const signals: Signal[] = [];

  // 1. Known AI User Agent
  const knownAiAgents = [...(policy.known_ai_agents || []), ...KNOWN_AI_AGENTS_DEFAULT];
  if (knownAiAgents.some((ua) => context.userAgent.includes(ua))) {
    signals.push({ type: 'known_ai_user_agent', weight: 0, evidence: context.userAgent });
  }

  // 2. Suspicious User Agent patterns
  if (
    !signals.some((s) => s.type === 'known_ai_user_agent') &&
    SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(context.userAgent))
  ) {
    signals.push({ type: 'suspicious_user_agent', weight: 0, evidence: context.userAgent });
  }

  // 3. Missing Accept-Language header
  if (!context.acceptLanguage || context.acceptLanguage.trim() === '') {
    signals.push({ type: 'missing_accept_language', weight: 0 });
  }

  // 4. Missing cookies
  if (!context.cookies || Object.keys(context.cookies).length === 0) {
    signals.push({ type: 'missing_cookies', weight: 0 });
  }

  // 5. High request rate (built-in tracking)
  const bucket = rateBuckets.get(context.ip) || { count: 0, windowStart: Date.now() }
  if (Date.now() - bucket.windowStart > RATE_WINDOW_MS) {
    bucket.count = 0
    bucket.windowStart = Date.now()
  }
  bucket.count++
  rateBuckets.set(context.ip, bucket)

  if (bucket.count > RATE_LIMIT) {
    signals.push({ type: 'high_request_rate', weight: 0, evidence: `${bucket.count} req/min` })
  }

  // Also check caller-provided rate data
  if (context.requestCount && context.requestWindowMs) {
    const ratePerMinute = (context.requestCount / context.requestWindowMs) * 60000;
    if (ratePerMinute > 60) {
      signals.push({ type: 'high_request_rate', weight: 0, evidence: `${ratePerMinute.toFixed(1)} req/min` });
    }
  }

  // 6. Honeypot hit
  const honeypots = policy.honeypots || [];
  if (honeypots.some((hp) => context.path.startsWith(hp))) {
    signals.push({ type: 'honeypot_hit', weight: 0, evidence: context.path });
  }

  // 7. No JS execution flag
  if (context.jsExecuted === false) {
    signals.push({ type: 'no_js_execution', weight: 0 });
  }

  // 8. Repeated path pattern (sequential crawling)
  if (context.sessionId) {
    // Tracked externally via fingerprinting SessionStore
    // If caller provides session data, use it
    if (context.headers['x-path-count']) {
      const pathCount = parseInt(context.headers['x-path-count'], 10)
      if (pathCount > 10) {
        signals.push({ type: 'repeated_path_pattern', weight: 0, evidence: `${pathCount} paths` })
      }
    }
  }

  // 9. Datacenter ASN detection
  const ua = context.userAgent.toLowerCase()
  const via = (context.headers['via'] || '').toLowerCase()
  const xForwardedFor = (context.headers['x-forwarded-for'] || '').toLowerCase()
  const combined = `${ua} ${via} ${xForwardedFor}`
  if (DATACENTER_ASN_RANGES.some(asn => combined.includes(asn.toLowerCase()))) {
    signals.push({ type: 'datacenter_asn', weight: 0, evidence: `Possible datacenter: ${combined.slice(0, 80)}` })
  }

  // 10. Robots.txt violation
  const userAgent = context.userAgent.toLowerCase()
  const disallowedPaths = policy.paths ? Object.keys(policy.paths).filter(p => p.startsWith('/')) : []
  if (userAgent.includes('bot') || userAgent.includes('crawler') || userAgent.includes('spider')) {
    const violation = disallowedPaths.find(dp => {
      const wildcardPath = dp.replace('/*', '/')
      return context.path.startsWith(wildcardPath)
    })
    if (violation) {
      signals.push({ type: 'robots_violation', weight: 0, evidence: `Disallowed path: ${context.path}` })
    }
  }

  // 11. Policy mismatch
  if (policy.paths && context.path in policy.paths) {
    const pathRule = policy.paths[context.path]
    if (pathRule && pathRule.action !== policy.defaults.action) {
      signals.push({ type: 'policy_mismatch', weight: 0, evidence: `Path ${context.path} has action ${pathRule.action}` })
    }
  }

  return signals;
}

export function isHoneypotPath(path: string, policy: AgentPolicy): boolean {
  const honeypots = policy.honeypots || [];
  return honeypots.some((hp) => path.startsWith(hp));
}
