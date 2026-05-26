/**
 * Canonical taxonomy types for the MCP security ecosystem.
 * TypeScript port of the Python mcp-taxonomy package.
 */

export enum AttackCategory {
  Injection = "injection",
  Jailbreak = "jailbreak",
  Exfiltration = "exfiltration",
  ToolPoisoning = "tool_poisoning",
  Impersonation = "impersonation",
  ResourceScan = "resource_scan",
  Anomaly = "anomaly",
  Stego = "stego",
  EncodedPayload = "encoded_payload",
  Scareware = "scareware",
  Malware = "malware",
  PolicyViolation = "policy_violation",
  UnicodeAttack = "unicode_attack",
  Homoglyph = "homoglyph",
  CommandInjection = "command_injection",
  SqlInjection = "sql_injection",
  SSRF = "ssrf",
  RCE = "rce",
  Crawl = "crawl",
  Misconfiguration = "misconfiguration",
}

export enum Severity {
  Critical = "critical",
  High = "high",
  Medium = "medium",
  Low = "low",
  Info = "info",
}

export enum Confidence {
  Certain = "certain",
  High = "high",
  Medium = "medium",
  Low = "low",
  None = "none",
}

export const SEVERITY_WEIGHTS: Record<Severity, number> = {
  [Severity.Critical]: 25,
  [Severity.High]: 10,
  [Severity.Medium]: 3,
  [Severity.Low]: 1,
  [Severity.Info]: 0,
};

export function severityFromScore(score: number): Severity {
  if (score >= 80) return Severity.Critical;
  if (score >= 50) return Severity.High;
  if (score >= 20) return Severity.Medium;
  if (score >= 5) return Severity.Low;
  return Severity.Info;
}

export const CATEGORY_SEVERITY: Record<AttackCategory, Severity> = {
  [AttackCategory.RCE]: Severity.Critical,
  [AttackCategory.CommandInjection]: Severity.Critical,
  [AttackCategory.SqlInjection]: Severity.Critical,
  [AttackCategory.Malware]: Severity.Critical,
  [AttackCategory.Exfiltration]: Severity.High,
  [AttackCategory.ToolPoisoning]: Severity.High,
  [AttackCategory.SSRF]: Severity.High,
  [AttackCategory.Jailbreak]: Severity.High,
  [AttackCategory.Injection]: Severity.High,
  [AttackCategory.Scareware]: Severity.High,
  [AttackCategory.PolicyViolation]: Severity.Medium,
  [AttackCategory.Impersonation]: Severity.Medium,
  [AttackCategory.Stego]: Severity.Medium,
  [AttackCategory.ResourceScan]: Severity.Medium,
  [AttackCategory.UnicodeAttack]: Severity.Medium,
  [AttackCategory.EncodedPayload]: Severity.Medium,
  [AttackCategory.Anomaly]: Severity.Medium,
  [AttackCategory.Crawl]: Severity.Low,
  [AttackCategory.Homoglyph]: Severity.Low,
  [AttackCategory.Misconfiguration]: Severity.Low,
};

export interface TaxonomyEvent {
  source: string;
  attackCategory: AttackCategory;
  severity: Severity;
  confidence: Confidence;
  title: string;
  description?: string;
  recommendation?: string;
  target?: string;
  snippet?: string;
  riskScore: number;
  blocked?: boolean | null;
  timestamp?: string;
}

export function agentgateSignalToTaxonomy(
  signalType: string,
  weight: number = 0,
  action: string = "",
  path: string = "",
  userAgent: string = "",
  score: number = 0,
): TaxonomyEvent {
  const signalCategoryMap: Record<string, AttackCategory> = {
    known_ai_user_agent: AttackCategory.Crawl,
    suspicious_user_agent: AttackCategory.Crawl,
    missing_accept_language: AttackCategory.Anomaly,
    missing_cookies: AttackCategory.Anomaly,
    high_request_rate: AttackCategory.Crawl,
    honeypot_hit: AttackCategory.Crawl,
    robots_violation: AttackCategory.Crawl,
    no_js_execution: AttackCategory.Anomaly,
    datacenter_asn: AttackCategory.Crawl,
    repeated_path_pattern: AttackCategory.Crawl,
    policy_mismatch: AttackCategory.Anomaly,
  };

  const actionSeverity: Record<string, Severity> = {
    allow: Severity.Info,
    limited: Severity.Low,
    challenge: Severity.Medium,
    sandbox: Severity.High,
    block: Severity.Critical,
    log_only: Severity.Info,
  };

  const category = signalCategoryMap[signalType] ?? AttackCategory.Anomaly;
  const severity = actionSeverity[action] ?? Severity.Low;

  return {
    source: "agentgate",
    attackCategory: category,
    severity,
    confidence: weight >= 45 ? Confidence.Certain : weight >= 20 ? Confidence.High : Confidence.Medium,
    title: signalType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    target: path,
    snippet: userAgent.slice(0, 200),
    riskScore: score,
  };
}
