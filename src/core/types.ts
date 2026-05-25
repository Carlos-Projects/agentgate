/**
 * AgentGate Core Types
 * Policy-based firewall and honeypot middleware for AI agents
 */

export type AgentGateAction =
  | 'allow'
  | 'limited'
  | 'challenge'
  | 'sandbox'
  | 'block'
  | 'log_only';

export type SignalType =
  | 'known_ai_user_agent'
  | 'suspicious_user_agent'
  | 'missing_accept_language'
  | 'missing_cookies'
  | 'high_request_rate'
  | 'honeypot_hit'
  | 'robots_violation'
  | 'no_js_execution'
  | 'datacenter_asn'
  | 'repeated_path_pattern'
  | 'policy_mismatch';

export interface Signal {
  type: SignalType;
  weight: number;
  evidence?: string;
}

export interface RequestContext {
  ip: string;
  ipHash: string;
  ipRaw?: string;
  path: string;
  method: string;
  userAgent: string;
  referer?: string;
  acceptLanguage?: string;
  cookies: Record<string, string>;
  headers: Record<string, string>;
  timestamp: number;
  sessionId?: string;
  jsExecuted?: boolean;
  requestCount?: number;
  requestWindowMs?: number;
}

export interface ScoringConfig {
  weights: Record<SignalType, number>;
  thresholds: {
    allow: number;
    limited: number;
    challenge: number;
    sandbox: number;
    block: number;
  };
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: {
    known_ai_user_agent: 25,
    suspicious_user_agent: 15,
    missing_accept_language: 10,
    missing_cookies: 8,
    high_request_rate: 20,
    honeypot_hit: 50,
    robots_violation: 30,
    no_js_execution: 10,
    datacenter_asn: 15,
    repeated_path_pattern: 15,
    policy_mismatch: 35,
  },
  thresholds: {
    allow: 0,
    limited: 30,
    challenge: 55,
    sandbox: 70,
    block: 90,
  },
};

// Privacy configuration
export interface PrivacyConfig {
  hash_ip: boolean;
  log_raw_ip: boolean;
}

// Rate limit configuration
export interface RateLimitPolicy {
  enabled: boolean;
  store: 'memory' | 'redis';
  key_prefix?: string;
  failure_mode: 'open' | 'challenge' | 'block';
  rules: {
    default: {
      window_ms: number;
      max_requests: number;
      action: AgentGateAction;
    };
    suspected_agent: {
      window_ms: number;
      max_requests: number;
      action: AgentGateAction;
    };
    honeypot_hit: {
      window_ms: number;
      max_requests: number;
      action: AgentGateAction;
    };
    paths?: Record<string, {
      window_ms: number;
      max_requests: number;
      action: AgentGateAction;
    }>;
  };
}

// Session configuration
export interface SessionPolicy {
  enabled: boolean;
  ttl_ms: number;
  fallback_ttl_ms: number;
  cookie_name: string;
  cookie_secure: boolean;
  cookie_same_site: 'Lax' | 'Strict' | 'None';
  track_paths: boolean;
  max_paths: number;
}

// Dashboard configuration
export interface DashboardPolicy {
  enabled: boolean;
  require_auth: boolean;
}

// Webhook configuration
export interface WebhookPolicy {
  enabled: boolean;
  targets: Array<{
    name: string;
    url: string;
    events: Array<
      | 'honeypot_hit'
      | 'critical_score'
      | 'blocked'
      | 'rate_limit_exceeded'
      | 'session_violation'
    >;
    secret?: string;
    timeout_ms?: number;
  }>;
}

export interface AgentPolicy {
  mode: 'log_only' | 'enforce';
  defaults: {
    action: AgentGateAction;
    expose_debug_headers: boolean;
  };
  approved_agents: Array<{
    name: string;
    action: AgentGateAction;
    paths?: string[];
  }>;
  known_ai_agents: string[];
  paths: Record<
    string,
    {
      action: AgentGateAction;
      max_requests_per_minute?: number;
    }
  >;
  scoring?: Partial<ScoringConfig>;
  honeypots?: string[];
  privacy?: PrivacyConfig;
  rate_limit?: RateLimitPolicy;
  session?: SessionPolicy;
  dashboard?: DashboardPolicy;
  webhooks?: WebhookPolicy;
}

export const DEFAULT_POLICY: AgentPolicy = {
  mode: 'log_only',
  defaults: {
    action: 'allow',
    expose_debug_headers: false,
  },
  approved_agents: [],
  known_ai_agents: [
    'GPTBot',
    'ClaudeBot',
    'PerplexityBot',
    'CCBot',
    'Applebot-Extended',
    'Google-Extended',
  ],
  paths: {},
  honeypots: ['/agent-honeypot', '/bot-trap', '/internal-agent-policy', '/scrape-check'],
  privacy: {
    hash_ip: true,
    log_raw_ip: false,
  },
  rate_limit: undefined,
  session: undefined,
  dashboard: undefined,
  webhooks: undefined,
};

export interface DecisionResult {
  action: AgentGateAction;
  score: number;
  signals: SignalType[];
  reason?: string;
  redirectPath?: string;
  headers?: Record<string, string>;
}

export interface LogEntry {
  timestamp: string;
  ip: string;
  ipRaw?: string;
  path: string;
  userAgent: string;
  score: number;
  action: AgentGateAction;
  signals: SignalType[];
  method?: string;
  referer?: string;
  responseTime?: number;
}

export interface Logger {
  log(entry: LogEntry): Promise<void>;
  getLogs?(limit?: number): Promise<LogEntry[]>;
}

export interface AdapterRequest {
  ip: string;
  path: string;
  method: string;
  userAgent: string;
  referer?: string;
  acceptLanguage?: string;
  cookies: Record<string, string>;
  headers: Record<string, string>;
  jsExecuted?: boolean;
}

export interface AdapterResponse {
  status?: number;
  headers?: Record<string, string>;
  redirect?: string;
  body?: string;
}

export interface Adapter {
  normalizeRequest(req: unknown): AdapterRequest;
  createResponse(result: DecisionResult): AdapterResponse;
}

export interface HoneypotGenerator {
  generateUrl(context?: unknown): string;
  validateToken(token: string): boolean;
  isHoneypotPath(path: string): boolean;
}
