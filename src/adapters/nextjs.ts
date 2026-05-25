/**
 * Next.js Adapter
 * Integrates AgentGate with Next.js middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { AdapterRequest, AdapterResponse, DecisionResult } from '../core/types';
import { extractClientIP, parseCookies } from '../core/normalize';

export function normalizeNextRequest(req: NextRequest): AdapterRequest {
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const cookieHeader = req.headers.get('cookie') ?? undefined;

  return {
    ip: extractClientIP(headers),
    path: req.nextUrl.pathname,
    method: req.method,
    userAgent: req.headers.get('user-agent') || '',
    referer: req.headers.get('referer') || undefined,
    acceptLanguage: req.headers.get('accept-language') || undefined,
    cookies: parseCookies(cookieHeader),
    headers,
    jsExecuted: req.cookies.get('agentgate-js') !== undefined,
  };
}

export function createNextResponse(
  result: DecisionResult,
  originalUrl: string
): NextResponse {
  const response = new NextResponse();

  if (result.headers) {
    Object.entries(result.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  if (result.action === 'block') {
    response.headers.set('X-AgentGate-Blocked', 'true');
    return NextResponse.json(
      {
        error: 'Access denied',
        reason: result.reason,
        score: result.score,
      },
      { status: 403, headers: response.headers }
    );
  }

  if (result.redirectPath) {
    const redirectUrl = new URL(result.redirectPath, originalUrl);
    return NextResponse.redirect(redirectUrl.toString(), { headers: response.headers });
  }

  if (result.action === 'limited') {
    response.headers.set('X-AgentGate-Limited', 'true');
  }

  return response;
}

export interface NextMiddlewareResult {
  response: NextResponse;
  shouldContinue: boolean;
}

export function handleNextMiddleware(
  req: NextRequest,
  result: DecisionResult
): NextMiddlewareResult {
  if (result.action === 'block' || result.redirectPath) {
    return {
      response: createNextResponse(result, req.url),
      shouldContinue: false,
    };
  }

  const response = createNextResponse(result, req.url);
  return {
    response,
    shouldContinue: true,
  };
}
