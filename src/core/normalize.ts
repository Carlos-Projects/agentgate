/**
 * Request Normalizer
 * Converts framework-specific requests to AgentGate RequestContext
 */

import * as crypto from 'crypto'
import { RequestContext, AdapterRequest, PrivacyConfig } from './types'

let ipSalt: string = process.env.AGENTGATE_IP_SALT || crypto.randomBytes(16).toString('hex')

export function setIpSalt(salt: string): void {
  ipSalt = salt
}

function sanitizeField(value: string, maxLen: number): string {
  if (!value) return value
  let s = value.slice(0, maxLen)
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
  return s
}

export function normalizeRequest(
  req: AdapterRequest,
  privacy?: PrivacyConfig
): RequestContext {
  const shouldHash = privacy?.hash_ip ?? true
  const ipHash = shouldHash ? hashIp(req.ip) : req.ip
  const ipRaw = privacy?.log_raw_ip ? req.ip : undefined

  return {
    ip: ipHash,
    ipHash,
    ipRaw,
    path: sanitizeField(req.path, 2048),
    method: req.method,
    userAgent: sanitizeField(req.userAgent || '', 512),
    referer: req.referer ? sanitizeField(req.referer, 2048) : undefined,
    acceptLanguage: req.acceptLanguage,
    cookies: req.cookies || {},
    headers: req.headers || {},
    timestamp: Date.now(),
    jsExecuted: req.jsExecuted,
  }
}

export function hashIp(ip: string, _salt?: string): string {
  return crypto.createHmac('sha256', _salt || ipSalt).update(ip).digest('hex')
}

export function extractClientIP(
  headers: Record<string, string>,
  trustedProxies?: string[]
): string {
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
      const ips = value.split(',').map((ip) => ip.trim()).filter(Boolean)
      const firstIp = ips[0]
      const lastIp = ips[ips.length - 1]

      if (trustedProxies && trustedProxies.length > 0) {
        if (lastIp && trustedProxies.includes(lastIp)) {
          return firstIp || lastIp
        }
        return lastIp || firstIp || 'unknown'
      }

      return firstIp || 'unknown'
    }
  }

  return 'unknown'
}

const MAX_COOKIES = 50
const MAX_COOKIE_KEY_LENGTH = 128
const MAX_COOKIE_VALUE_LENGTH = 4096
const MAX_COOKIE_HEADER_LENGTH = 8192

function isValidUtf8(str: string): boolean {
  try {
    decodeURIComponent(encodeURIComponent(str))
    return true
  } catch {
    return false
  }
}

export function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) {
    return {}
  }

  if (cookieHeader.length > MAX_COOKIE_HEADER_LENGTH) {
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
      if (!isValidUtf8(k) || !isValidUtf8(v)) {
        continue
      }
      cookies[k] = v
      count++
    }
  }

  return cookies
}
