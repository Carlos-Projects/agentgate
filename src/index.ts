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

export { detectSignals, isHoneypotPath, cleanupRateTracking } from './core/detect';
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
export { analyzeContent, analyzeText, detectStegoContent } from './core/content-analyzer';
export type { ContentAnalysisResult } from './core/content-analyzer';
export { generateVariants, getCategories, getTechniqueCount, OBFUSCATION_TECHNIQUES } from './redteam/parseltongue';
export type { ObfuscationResult, ObfuscationCategory } from './redteam/parseltongue';
export { SessionStore, recordRequest, setJsVerified, setJsCookieDetected, calculateFingerprintScore, generateJsChallenge, parseFingerprintCookie, generateChallengePage } from './core/fingerprint';

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

// Session
export { SessionManager } from './session/index';
export type { SessionResult } from './session/index';

// Store
export { MemorySessionStore } from './store/memory/index';
export type { SessionPersistenceStore } from './store/types';

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

    if (this.policy.rate_limit?.enabled && this.policy.rate_limit.store === 'redis') {
      throw new Error('Redis stores are not implemented yet. Set rate_limit.store to "memory" or integrate agentgate as middleware.')
    }

    if (this.policy.dashboard?.require_auth && !process.env.AGENTGATE_DASHBOARD_TOKEN) {
      throw new Error('Dashboard auth enabled but AGENTGATE_DASHBOARD_TOKEN environment variable not set.')
    }
  }

  async processRequest(req: AdapterRequest): Promise<DecisionResult> {
    const startTime = Date.now();
    const context = normalizeRequest(req);

    // Dashboard auth enforcement
    if (this.policy.dashboard?.enabled && this.policy.dashboard?.require_auth) {
      const dashboardPaths = ['/agentgate-dashboard', '/agentgate-verify', '/agentgate-declare', '/agentgate-api']
      if (dashboardPaths.some(p => context.path.startsWith(p))) {
        const authHeader = context.headers['authorization'] || context.headers['x-dashboard-token'] || ''
        const expectedToken = process.env.AGENTGATE_DASHBOARD_TOKEN || ''
        if (!expectedToken) {
          throw new Error('Dashboard auth enabled but AGENTGATE_DASHBOARD_TOKEN not configured.')
        }
        if (authHeader !== `Bearer ${expectedToken}` && authHeader !== expectedToken) {
          return {
            action: 'block',
            score: 100,
            signals: ['policy_mismatch'],
            reason: 'Unauthorized dashboard access',
          }
        }
      }
    }

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

    // Audit trail for critical decisions
    if (result.action === 'block' || result.action === 'sandbox' || result.action === 'challenge') {
      const auditEntry = {
        type: 'audit' as const,
        timestamp: new Date().toISOString(),
        action: result.action,
        score: result.score,
        signals: result.signals,
        ip: context.ip,
        path: context.path,
        userAgent: context.userAgent,
        method: context.method,
        reason: result.reason,
      }
      console.warn(`[AgentGate Audit] ${auditEntry.action.toUpperCase()} score=${auditEntry.score} path=${auditEntry.path} ip=${auditEntry.ip}`)
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
