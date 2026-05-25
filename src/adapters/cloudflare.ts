/**
 * Cloudflare Workers Adapter
 * Integrates AgentGate with Cloudflare Workers
 */

import { AdapterRequest, DecisionResult } from '../core/types'
import { extractClientIP, parseCookies } from '../core/normalize'
import { AgentGate } from '../index'

export interface CloudflareEnv {
  AGENTGATE_POLICY?: string
  AGENTGATE_REDIS_URL?: string
  AGENTGATE_REDIS_TOKEN?: string
  AGENTGATE_WEBHOOK_URL?: string
  AGENTGATE_DASHBOARD_TOKEN?: string
}

// ExecutionContext type for Cloudflare Workers
declare global {
  interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void
    passThroughOnException(): void
  }
}

export function normalizeCloudflareRequest(
  request: Request,
  env?: CloudflareEnv
): AdapterRequest {
  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    headers[key] = value
  })

  // Cloudflare provides the real client IP in cf-connecting-ip
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  const cookieHeader = request.headers.get('cookie') ?? undefined
  const url = new URL(request.url)

  return {
    ip,
    path: url.pathname,
    method: request.method,
    userAgent: request.headers.get('user-agent') || '',
    referer: request.headers.get('referer') || undefined,
    acceptLanguage: request.headers.get('accept-language') || undefined,
    cookies: parseCookies(cookieHeader),
    headers,
    jsExecuted: request.headers.get('cf-js-executed') !== null,
  }
}

export function createBlockResponse(result: DecisionResult): Response {
  return new Response(
    JSON.stringify({
      error: 'Access denied',
      reason: result.reason,
      score: result.score,
    }),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        ...result.headers,
        'Cache-Control': 'no-store',
      },
    }
  )
}

export function createRedirectResponse(result: DecisionResult, baseUrl: string): Response {
  const redirectUrl = new URL(result.redirectPath!, baseUrl)
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectUrl.toString(),
      ...result.headers,
      'Cache-Control': 'no-store',
    },
  })
}

export async function handleCloudflareRequest(
  request: Request,
  env: CloudflareEnv,
  ctx: ExecutionContext,
  agentGate: AgentGate
): Promise<Response> {
  const url = new URL(request.url)
  const pathname = url.pathname

  // Skip AgentGate for static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|map)$/i) ||
    pathname === '/favicon.ico'
  ) {
    return fetch(request)
  }

  // Dashboard auth check
  if (pathname.startsWith('/agentgate-dashboard')) {
    const expectedToken = env.AGENTGATE_DASHBOARD_TOKEN
    const isDev = !expectedToken

    if (!isDev) {
      // Production: require auth
      const headerToken = request.headers.get('authorization')?.replace('Bearer ', '')
      
      if (!headerToken || headerToken !== expectedToken) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized', message: 'Authorization: Bearer <token> required' }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }
  }

  // Normalize request
  const adapterRequest = normalizeCloudflareRequest(request, env)

  // Process through AgentGate with Cloudflare runtime context
  const result = await agentGate.processRequest(adapterRequest, {
    waitUntil: (promise: Promise<unknown>) => ctx.waitUntil(promise),
  })

  // Block
  if (result.action === 'block') {
    return createBlockResponse(result)
  }

  // Redirect
  if (result.redirectPath) {
    return createRedirectResponse(result, request.url)
  }

  // Allow: fetch origin and add AgentGate headers
  const originResponse = await fetch(request)
  const response = new Response(originResponse.body, {
    status: originResponse.status,
    statusText: originResponse.statusText,
    headers: originResponse.headers,
  })

  // Add AgentGate headers (except Set-Cookie which is handled separately)
  if (result.headers) {
    Object.entries(result.headers).forEach(([key, value]) => {
      if (key !== 'Set-Cookie') {
        response.headers.set(key, value)
      }
    })
  }

  return response
}

export interface CloudflareMiddlewareResult {
  response: Response
  shouldContinue: boolean
}

export function handleCloudflareMiddleware(
  request: Request,
  result: DecisionResult
): CloudflareMiddlewareResult {
  if (result.action === 'block' || result.redirectPath) {
    return {
      response: result.action === 'block'
        ? createBlockResponse(result)
        : createRedirectResponse(result, request.url),
      shouldContinue: false,
    }
  }

  // For allow/limited, caller should fetch origin and add headers
  return {
    response: new Response(null, { headers: result.headers }),
    shouldContinue: true,
  }
}

// Factory function for easy Cloudflare Worker setup
export async function createAgentGateForCloudflare(
  env: CloudflareEnv
): Promise<AgentGate> {
  const { loadPolicyFromString, createConsoleLogger } = await import('../index')

  const policy = loadPolicyFromString(env.AGENTGATE_POLICY || '')
  const logger = createConsoleLogger({ colors: false })

  return new AgentGate({ policy, logger })
}
