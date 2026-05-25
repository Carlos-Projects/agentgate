/**
 * AgentGate
 * Policy-based firewall and honeypot middleware for AI agents
 */

// Core exports
export {
  DEFAULT_POLICY,
  DEFAULT_SCORING_CONFIG,
} from './core/types';
export type {
  AgentGateAction,
  AgentPolicy,
  DecisionResult,
  LogEntry,
  RequestContext,
  ScoringConfig,
  Signal,
  SignalType,
  Logger,
  Adapter,
  HoneypotGenerator,
} from './core/types';

export { detectSignals, isHoneypotPath } from './core/detect';
export { calculateScore, getActionFromScore, getSignalTypes } from './core/score';
export {
  loadPolicy,
  loadPolicyFromString,
  getActionForPath,
  getActionForAgent,
  getScoringConfig,
} from './core/policy';
export { decide } from './core/decide';
export { normalizeRequest, extractClientIP, parseCookies } from './core/normalize';
export { SessionStore, recordRequest, setJsVerified, setJsCookieDetected, calculateFingerprintScore, generateJsChallenge, parseFingerprintCookie, generateChallengePage } from './core/fingerprint';
export type { FingerprintData, SessionFingerprint, RequestPattern } from './core/fingerprint';
export { generateAgentAccessPage, generateDeclarationApiResponse } from './core/portal';
export type { AgentDeclaration } from './core/portal';

// Adapters
export {
  normalizeNextRequest,
  createNextResponse,
  handleNextMiddleware,
} from './adapters/nextjs';
export type { NextMiddlewareResult } from './adapters/nextjs';

export {
  normalizeExpressRequest,
  createExpressResponse,
  createExpressMiddleware,
} from './adapters/express';

// Honeypot
export { StaticHoneypotGenerator, createStaticHoneypotGenerator } from './honeypot/static';
export {
  DynamicHoneypotGenerator,
  createDynamicHoneypotGenerator,
} from './honeypot/dynamic';
export type { DynamicHoneypotOptions } from './honeypot/dynamic';

export {
  HONEYPOT_PAGES,
  HONEYPOT_API_ENDPOINTS,
  generateInfiniteContent,
  generateRecursiveLinks,
} from './honeypot/content';

export {
  LargePageDrain,
  SlowStreamDrain,
  RecursiveNavigationDrain,
} from './honeypot/drain';
export type { DrainResult } from './honeypot/drain';

// HoneypotServer temporarily removed (use standalone example instead)
// export { HoneypotServer } from './honeypot/server';

// Logger
export { JsonlLogger, createJsonlLogger } from './logger/jsonl';
export type { JsonlLoggerOptions } from './logger/jsonl';

export { ConsoleLogger, createConsoleLogger } from './logger/console';
export type { ConsoleLoggerOptions } from './logger/console';

// Dashboard
export { readLogs, countLogs } from './dashboard/readLogs';
export type { LogQueryOptions } from './dashboard/readLogs';

export { generateSummary, getQuickStats } from './dashboard/summarize';
export type { DashboardSummary } from './dashboard/summarize';

// Main AgentGate class
import { AgentPolicy, RequestContext, DecisionResult, Logger } from './core/types';
import { detectSignals } from './core/detect';
import { calculateScore } from './core/score';
import { getScoringConfig } from './core/policy';
import { decide } from './core/decide';
import { normalizeRequest } from './core/normalize';
import { AdapterRequest } from './core/types';

export interface AgentGateOptions {
  policy: AgentPolicy;
  logger?: Logger;
}

export class AgentGate {
  private policy: AgentPolicy;
  private logger?: Logger;

  constructor(options: AgentGateOptions) {
    this.policy = options.policy;
    this.logger = options.logger;
  }

  async processRequest(req: AdapterRequest): Promise<DecisionResult> {
    const startTime = Date.now();
    const context = normalizeRequest(req);

    // Detect signals
    const signals = detectSignals(context, this.policy);

    // Calculate score
    const scoringConfig = getScoringConfig(this.policy);
    const score = calculateScore(signals, scoringConfig);

    // Make decision
    const result = decide(
      score,
      signals,
      context.path,
      context.userAgent,
      this.policy
    );

    // Log if logger is available
    if (this.logger) {
      await this.logger.log({
        timestamp: new Date().toISOString(),
        ip: context.ip,
        path: context.path,
        userAgent: context.userAgent,
        score: result.score,
        action: result.action,
        signals: result.signals,
        method: context.method,
        referer: context.referer,
        responseTime: Date.now() - startTime,
      });
    }

    return result;
  }

  getPolicy(): AgentPolicy {
    return { ...this.policy };
  }

  updatePolicy(policy: Partial<AgentPolicy>): void {
    const allowedKeys = ['mode', 'defaults', 'known_ai_agents', 'approved_agents', 'paths', 'honeypots', 'scoring']
    for (const key of Object.keys(policy)) {
      if (!allowedKeys.includes(key)) {
        console.warn(`[AgentGate] Ignoring unknown policy key: ${key}`)
        delete (policy as Record<string, unknown>)[key]
      }
    }
    this.policy = { ...this.policy, ...policy };
  }
}

export function createAgentGate(options: AgentGateOptions): AgentGate {
  return new AgentGate(options);
}

export default AgentGate;
