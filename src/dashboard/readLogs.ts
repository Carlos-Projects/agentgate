/**
 * Dashboard Log Reader
 * Reads and parses AgentGate logs for dashboard display
 */

import * as fs from 'fs';
import * as path from 'path';
import { LogEntry } from '../core/types';

export interface LogQueryOptions {
  limit?: number;
  offset?: number;
  action?: string;
  path?: string;
  minScore?: number;
  startDate?: string;
  endDate?: string;
}

const DASHBOARD_RATE_LIMIT = 30
const DASHBOARD_RATE_WINDOW = 60_000
const dashboardRateBuckets = new Map<string, { count: number; windowStart: number }>()

function checkDashboardRateLimit(clientIp: string): boolean {
  const now = Date.now()
  let bucket = dashboardRateBuckets.get(clientIp)
  if (!bucket || now - bucket.windowStart > DASHBOARD_RATE_WINDOW) {
    bucket = { count: 0, windowStart: now }
    dashboardRateBuckets.set(clientIp, bucket)
  }
  bucket.count++
  return bucket.count <= DASHBOARD_RATE_LIMIT
}

export async function readLogs(
  logFilePath: string,
  options: LogQueryOptions = {},
  clientIp: string = '127.0.0.1'
): Promise<LogEntry[]> {
  if (!checkDashboardRateLimit(clientIp)) {
    console.warn(`Dashboard rate limit exceeded for ${clientIp}`)
    return []
  }
  const filePath = path.resolve(logFilePath);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter((line) => line);
    let entries = lines.map((line) => JSON.parse(line) as LogEntry);

    // Apply filters
    if (options.action) {
      entries = entries.filter((e) => e.action === options.action);
    }
    if (options.path) {
      entries = entries.filter((e) => e.path.includes(options.path!));
    }
    if (options.minScore !== undefined) {
      entries = entries.filter((e) => e.score >= options.minScore!);
    }
    if (options.startDate) {
      entries = entries.filter((e) => e.timestamp >= options.startDate!);
    }
    if (options.endDate) {
      entries = entries.filter((e) => e.timestamp <= options.endDate!);
    }

    // Sort by timestamp descending
    entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 100;
    return entries.slice(offset, offset + limit);
  } catch (error) {
    console.error('Failed to read logs:', error);
    return [];
  }
}

export async function countLogs(logFilePath: string, clientIp: string = '127.0.0.1'): Promise<number> {
  if (!checkDashboardRateLimit(clientIp)) {
    console.warn(`Dashboard rate limit exceeded for ${clientIp}`)
    return 0
  }
  const filePath = path.resolve(logFilePath);

  if (!fs.existsSync(filePath)) {
    return 0;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter((line) => line);
    return lines.length;
  } catch (error) {
    console.error('Failed to count logs:', error);
    return 0;
  }
}
