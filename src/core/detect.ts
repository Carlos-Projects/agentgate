/**
 * Signal Detection Engine
 * Extracts and identifies signals from request context
 */

import { RequestContext, Signal, SignalType, AgentPolicy } from './types';

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

export function detectSignals(
  context: RequestContext,
  policy: AgentPolicy
): Signal[] {
  const signals: Signal[] = [];

  // 1. Known AI User Agent
  const knownAiAgents = [...policy.known_ai_agents, ...KNOWN_AI_AGENTS_DEFAULT];
  if (knownAiAgents.some((ua) => context.userAgent.includes(ua))) {
    signals.push({
      type: 'known_ai_user_agent',
      weight: 0,
      evidence: context.userAgent,
    });
  }

  // 2. Suspicious User Agent patterns
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /httpclient/i,
  ];
  if (
    !signals.some((s) => s.type === 'known_ai_user_agent') &&
    suspiciousPatterns.some((pattern) => pattern.test(context.userAgent))
  ) {
    signals.push({
      type: 'suspicious_user_agent',
      weight: 0,
      evidence: context.userAgent,
    });
  }

  // 3. Missing Accept-Language header
  if (!context.acceptLanguage || context.acceptLanguage.trim() === '') {
    signals.push({
      type: 'missing_accept_language',
      weight: 0,
    });
  }

  // 4. Missing cookies
  if (!context.cookies || Object.keys(context.cookies).length === 0) {
    signals.push({
      type: 'missing_cookies',
      weight: 0,
    });
  }

  // 5. High request rate
  if (context.requestCount && context.requestWindowMs) {
    const ratePerMinute = (context.requestCount / context.requestWindowMs) * 60000;
    if (ratePerMinute > 60) {
      signals.push({
        type: 'high_request_rate',
        weight: 0,
        evidence: `${ratePerMinute.toFixed(1)} req/min`,
      });
    }
  }

  // 6. Honeypot hit
  const honeypots = policy.honeypots || [];
  if (honeypots.some((hp) => context.path.startsWith(hp))) {
    signals.push({
      type: 'honeypot_hit',
      weight: 0,
      evidence: context.path,
    });
  }

  // 7. No JS execution flag
  if (context.jsExecuted === false) {
    signals.push({
      type: 'no_js_execution',
      weight: 0,
    });
  }

  // 8. Repeated path pattern (sequential crawling)
  if (context.sessionId) {
    // This would need session tracking - placeholder for now
  }

  return signals;
}

export function isHoneypotPath(path: string, policy: AgentPolicy): boolean {
  const honeypots = policy.honeypots || [];
  return honeypots.some((hp) => path.startsWith(hp));
}
