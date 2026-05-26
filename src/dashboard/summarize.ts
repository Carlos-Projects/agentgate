/**
 * Dashboard Summary Generator
 * Creates aggregated statistics from logs
 */

import { LogEntry } from '../core/types';
import { readLogs } from './readLogs';

export interface DashboardSummary {
  totalRequests: number;
  suspectedAgents: number;
  topUserAgents: Array<{ ua: string; count: number }>;
  topPaths: Array<{ path: string; count: number }>;
  honeypotHits: number;
  actionsTaken: Record<string, number>;
  scoreDistribution: {
    low: number; // 0-30
    medium: number; // 31-60
    high: number; // 61-90
    critical: number; // 91-100
  };
  recentEvents: LogEntry[];
}

const DASHBOARD_SUMMARY_RATE_LIMIT = 10
const DASHBOARD_SUMMARY_WINDOW = 60_000
const summaryRateBuckets = new Map<string, { count: number; windowStart: number }>()

function checkSummaryRateLimit(clientIp: string): boolean {
  const now = Date.now()
  let bucket = summaryRateBuckets.get(clientIp)
  if (!bucket || now - bucket.windowStart > DASHBOARD_SUMMARY_WINDOW) {
    bucket = { count: 0, windowStart: now }
    summaryRateBuckets.set(clientIp, bucket)
  }
  bucket.count++
  return bucket.count <= DASHBOARD_SUMMARY_RATE_LIMIT
}

export async function generateSummary(
  logFilePath: string,
  limit: number = 1000,
  clientIp: string = '127.0.0.1'
): Promise<DashboardSummary> {
  if (!checkSummaryRateLimit(clientIp)) {
    console.warn(`Dashboard summary rate limit exceeded for ${clientIp}`)
    return {
      totalRequests: 0, suspectedAgents: 0, topUserAgents: [], topPaths: [],
      honeypotHits: 0, actionsTaken: {}, scoreDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
      recentEvents: [],
    }
  }

  const logs = await readLogs(logFilePath, { limit }, clientIp);

  const summary: DashboardSummary = {
    totalRequests: logs.length,
    suspectedAgents: 0,
    topUserAgents: [],
    topPaths: [],
    honeypotHits: 0,
    actionsTaken: {},
    scoreDistribution: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    },
    recentEvents: logs.slice(0, 10),
  };

  const uaCounts = new Map<string, number>();
  const pathCounts = new Map<string, number>();

  for (const entry of logs) {
    // Count suspected agents (score > 30)
    if (entry.score > 30) {
      summary.suspectedAgents++;
    }

    // Count user agents
    const ua = entry.userAgent || 'unknown';
    uaCounts.set(ua, (uaCounts.get(ua) || 0) + 1);

    // Count paths
    pathCounts.set(entry.path, (pathCounts.get(entry.path) || 0) + 1);

    // Count honeypot hits
    if (entry.signals.includes('honeypot_hit')) {
      summary.honeypotHits++;
    }

    // Count actions
    summary.actionsTaken[entry.action] =
      (summary.actionsTaken[entry.action] || 0) + 1;

    // Score distribution
    if (entry.score <= 30) {
      summary.scoreDistribution.low++;
    } else if (entry.score <= 60) {
      summary.scoreDistribution.medium++;
    } else if (entry.score <= 90) {
      summary.scoreDistribution.high++;
    } else {
      summary.scoreDistribution.critical++;
    }
  }

  // Top user agents
  summary.topUserAgents = Array.from(uaCounts.entries())
    .map(([ua, count]) => ({ ua, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top paths
  summary.topPaths = Array.from(pathCounts.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return summary;
}

export async function getQuickStats(logFilePath: string): Promise<{
  totalRequests: number;
  blockedCount: number;
  sandboxCount: number;
  avgScore: number;
}> {
  const logs = await readLogs(logFilePath, { limit: 10000 });

  const blockedCount = logs.filter((e) => e.action === 'block').length;
  const sandboxCount = logs.filter((e) => e.action === 'sandbox').length;
  const avgScore =
    logs.reduce((sum, e) => sum + e.score, 0) / (logs.length || 1);

  return {
    totalRequests: logs.length,
    blockedCount,
    sandboxCount,
    avgScore: Math.round(avgScore),
  };
}
