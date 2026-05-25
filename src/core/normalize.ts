/**
 * Request Normalizer
 * Converts framework-specific requests to AgentGate RequestContext
 */

import { RequestContext, AdapterRequest } from './types';

export function normalizeRequest(req: AdapterRequest): RequestContext {
  return {
    ip: req.ip,
    path: req.path,
    method: req.method,
    userAgent: req.userAgent || '',
    referer: req.referer,
    acceptLanguage: req.acceptLanguage,
    cookies: req.cookies || {},
    headers: req.headers || {},
    timestamp: Date.now(),
    jsExecuted: req.jsExecuted,
  };
}

export function extractClientIP(headers: Record<string, string>): string {
  // Check common IP headers in order of preference
  const ipHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',
    'x-client-ip',
    'forwarded-for',
    'forwarded',
  ];

  for (const header of ipHeaders) {
    const value = headers[header];
    if (value) {
      // x-forwarded-for can contain multiple IPs
      const ips = value.split(',').map((ip) => ip.trim());
      if (ips[0]) {
        return ips[0];
      }
    }
  }

  return 'unknown';
}

export function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  const cookies: Record<string, string> = {};
  const pairs = cookieHeader.split(';');

  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split('=');
    if (key) {
      cookies[key.trim()] = valueParts.join('=').trim();
    }
  }

  return cookies;
}
