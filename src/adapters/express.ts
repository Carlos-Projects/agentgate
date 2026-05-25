/**
 * Express Adapter
 */

import { Request, Response, NextFunction } from 'express';
import { AdapterRequest, DecisionResult } from '../core/types';
import { extractClientIP, parseCookies } from '../core/normalize';

export function normalizeExpressRequest(req: Request): AdapterRequest {
  const headers: Record<string, string> = {};
  Object.entries(req.headers).forEach(([key, value]) => {
    if (value) {
      headers[key] = Array.isArray(value) ? value.join(', ') : value;
    }
  });

  return {
    ip: extractClientIP(headers) || req.ip || 'unknown',
    path: req.path,
    method: req.method,
    userAgent: String(req.headers['user-agent'] || ''),
    referer: req.headers['referer'] as string | undefined,
    acceptLanguage: req.headers['accept-language'] as string | undefined,
    cookies: req.cookies || {},
    headers,
    jsExecuted: !!req.cookies?.['agentgate-js'],
  };
}

export function createExpressResponse(result: DecisionResult, res: Response): void {
  res.setHeader('Content-Type', 'application/json');
  
  if (result.headers) {
    Object.entries(result.headers).forEach(([key, value]) => {
      if (key !== 'Set-Cookie') res.setHeader(key, value);
    });
  }

  if (result.action === 'block') {
    res.status(403).json({ error: 'Access denied', reason: result.reason, score: result.score });
    return;
  }

  if (result.redirectPath) {
    res.redirect(result.redirectPath);
    return;
  }

  res.status(200).json({ action: result.action });
}

export function createExpressMiddleware(processRequest: (req: Request) => Promise<DecisionResult>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await processRequest(req);
      if (result.action === 'block' || result.redirectPath) {
        createExpressResponse(result, res);
        return;
      }
      if (result.headers) {
        Object.entries(result.headers).forEach(([key, value]) => {
          if (key !== 'Set-Cookie') res.setHeader(key, value);
        });
      }
      next();
    } catch (error) {
      console.error('AgentGate middleware error:', error);
      next(error);
    }
  };
}
