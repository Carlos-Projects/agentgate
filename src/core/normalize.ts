/**
 * Request Normalizer
 * Converts framework-specific requests to AgentGate RequestContext
 */

import * as crypto from 'crypto'
import { RequestContext, AdapterRequest, PrivacyConfig } from './types'

export function normalizeRequest(
  req: AdapterRequest,
  privacy?: PrivacyConfig
): RequestContext {
  const shouldHash = privacy?.hash_ip ?? true
  const ipHash = shouldHash ? hashIp(req.ip) : req.ip
  const ipRaw = privacy?.log_raw_ip ? req.ip : undefined

  return {
    ip: ipHash, // Use hash for rate limiting and logging
    ipHash,
    ipRaw,
    path: req.path,
    method: req.method,
    userAgent: req.userAgent || '',
    referer: req.referer,
    acceptLanguage: req.acceptLanguage,
    cookies: req.cookies || {},
    headers: req.headers || {},
    timestamp: Date.now(),
    jsExecuted: req.jsExecuted,
  }
}

export function hashIp(ip: string, salt?: string): string {
  const data = salt ? `${ip}:${salt}` : ip
  return crypto.createHash('sha256').update(data).digest('hex')
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
  ]

  for (const header of ipHeaders) {
    const value = headers[header]
    if (value) {
      // x-forwarded-for can contain multiple IPs
      const ips = value.split(',').map((ip) => ip.trim())
      if (ips[0]) {
        return ips[0]
      }
    }
  }

  return 'unknown'
}

const MAX_COOKIES = 50
const MAX_COOKIE_KEY_LENGTH = 128
const MAX_COOKIE_VALUE_LENGTH = 4096

export function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) {
    return {}
  }

  const cookies: Record<string, string> = {}
  const pairs = cookieHeader.split(';')
  let count = 0

  for (const pair of pairs) {
    if (count >= MAX_COOKIES) break
    const [key, ...valueParts] = pair.split('=')
    if (key) {
      const k = key.trim().slice(0, MAX_COOKIE_KEY_LENGTH)
      const v = valueParts.join('=').trim().slice(0, MAX_COOKIE_VALUE_LENGTH)
      cookies[k] = v
      count++
    }
  }

  return cookies
}
