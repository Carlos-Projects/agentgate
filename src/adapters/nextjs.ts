/**
 * Next.js Adapter
 */

import { NextRequest, NextResponse } from 'next/server';
import { AdapterRequest, DecisionResult } from '../core/types';
import { extractClientIP, parseCookies } from '../core/normalize';

export function normalizeNextRequest(req: NextRequest): AdapterRequest {
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => { headers[key] = value; });

  return {
    ip: extractClientIP(headers),
    path: req.nextUrl.pathname,
    method: req.method,
    userAgent: req.headers.get('user-agent') || '',
    referer: req.headers.get('referer') || undefined,
    acceptLanguage: req.headers.get('accept-language') || undefined,
    cookies: parseCookies(req.headers.get('cookie') ?? undefined),
    headers,
    jsExecuted: req.cookies.get('agentgate-js') !== undefined,
  };
}

export function createNextResponse(result: DecisionResult, originalUrl: string): NextResponse {
  const response = new NextResponse();
  if (result.headers) {
    Object.entries(result.headers).forEach(([key, value]) => {
      if (key !== 'Set-Cookie') response.headers.set(key, value);
    });
  }
  if (result.action === 'block') {
    return NextResponse.json({ error: 'Access denied', reason: result.reason, score: result.score }, { status: 403, headers: response.headers });
  }
  if (result.redirectPath) {
    return NextResponse.redirect(new URL(result.redirectPath, originalUrl), { headers: response.headers });
  }
  return response;
}

export interface NextMiddlewareResult { response: NextResponse; shouldContinue: boolean; }

export function handleNextMiddleware(req: NextRequest, result: DecisionResult): NextMiddlewareResult {
  if (result.action === 'block' || result.redirectPath) {
    return { response: createNextResponse(result, req.url), shouldContinue: false };
  }
  return { response: createNextResponse(result, req.url), shouldContinue: true };
}
