/**
 * Cloudflare Workers Adapter
 */

import { DecisionResult } from '../core/types'
import { parseCookies } from '../core/normalize'
import { AgentGate } from '../index'

export interface CloudflareEnv {
  AGENTGATE_POLICY?: string
  AGENTGATE_REDIS_URL?: string
  AGENTGATE_REDIS_TOKEN?: string
}

declare global { interface ExecutionContext { waitUntil(promise: Promise<unknown>): void } }

export function normalizeCloudflareRequest(request: Request): any {
  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => { headers[key] = value })
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const url = new URL(request.url)
  return {
    ip, path: url.pathname, method: request.method,
    userAgent: request.headers.get('user-agent') || '',
    referer: request.headers.get('referer') || undefined,
    acceptLanguage: request.headers.get('accept-language') || undefined,
    cookies: parseCookies(request.headers.get('cookie') ?? undefined),
    headers,
  }
}

export function createBlockResponse(result: DecisionResult): Response {
  return new Response(JSON.stringify({ error: 'Access denied', reason: result.reason, score: result.score }), {
    status: 403, headers: { 'Content-Type': 'application/json', ...result.headers, 'Cache-Control': 'no-store' },
  })
}

export function createRedirectResponse(result: DecisionResult, baseUrl: string): Response {
  return new Response(null, { status: 302, headers: { Location: new URL(result.redirectPath!, baseUrl).toString(), ...result.headers, 'Cache-Control': 'no-store' } })
}

export async function handleCloudflareRequest(request: Request, env: CloudflareEnv, ctx: ExecutionContext, agentGate: AgentGate): Promise<Response> {
  const url = new URL(request.url)
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|map)$/i) || url.pathname.startsWith('/_next')) {
    return fetch(request)
  }
  const result = await agentGate.processRequest(normalizeCloudflareRequest(request), { waitUntil: (p: Promise<unknown>) => ctx.waitUntil(p) })
  if (result.action === 'block') return createBlockResponse(result)
  if (result.redirectPath) return createRedirectResponse(result, request.url)
  const originResponse = await fetch(request)
  const response = new Response(originResponse.body, { status: originResponse.status, statusText: originResponse.statusText, headers: originResponse.headers })
  if (result.headers) Object.entries(result.headers).forEach(([k, v]) => { if (k !== 'Set-Cookie') response.headers.set(k, v) })
  return response
}

export async function createAgentGateForCloudflare(env: CloudflareEnv): Promise<AgentGate> {
  const { loadPolicyFromString, createConsoleLogger } = await import('../index')
  return new AgentGate({ policy: loadPolicyFromString(env.AGENTGATE_POLICY || ''), logger: createConsoleLogger({ colors: false }) })
}
