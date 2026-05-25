import { describe, it, expect } from 'vitest';
import { detectSignals, isHoneypotPath } from '../src/core/detect';
import { DEFAULT_POLICY, RequestContext } from '../src/core/types';

describe('detectSignals', () => {
  const baseRequest: RequestContext = {
    ip: '192.168.1.1',
    path: '/',
    method: 'GET',
    userAgent: 'Mozilla/5.0',
    acceptLanguage: 'en-US',
    cookies: { session: 'abc' },
    headers: {},
    timestamp: Date.now(),
  };

  it('should detect known AI user agent', () => {
    const request: RequestContext = {
      ...baseRequest,
      userAgent: 'GPTBot/1.0',
    };

    const signals = detectSignals(request, DEFAULT_POLICY);
    expect(signals.some((s) => s.type === 'known_ai_user_agent')).toBe(true);
  });

  it('should detect suspicious user agent', () => {
    const request: RequestContext = {
      ...baseRequest,
      userAgent: 'python-requests/2.28.0',
    };

    const signals = detectSignals(request, DEFAULT_POLICY);
    expect(signals.some((s) => s.type === 'suspicious_user_agent')).toBe(true);
  });

  it('should detect missing accept-language', () => {
    const request: RequestContext = {
      ...baseRequest,
      acceptLanguage: '',
    };

    const signals = detectSignals(request, DEFAULT_POLICY);
    expect(signals.some((s) => s.type === 'missing_accept_language')).toBe(true);
  });

  it('should detect missing cookies', () => {
    const request: RequestContext = {
      ...baseRequest,
      cookies: {},
    };

    const signals = detectSignals(request, DEFAULT_POLICY);
    expect(signals.some((s) => s.type === 'missing_cookies')).toBe(true);
  });

  it('should detect honeypot hit', () => {
    const request: RequestContext = {
      ...baseRequest,
      path: '/agent-honeypot',
    };

    const signals = detectSignals(request, DEFAULT_POLICY);
    expect(signals.some((s) => s.type === 'honeypot_hit')).toBe(true);
  });

  it('should detect high request rate', () => {
    const request: RequestContext = {
      ...baseRequest,
      requestCount: 100,
      requestWindowMs: 60000, // 100 requests per minute
    };

    const signals = detectSignals(request, DEFAULT_POLICY);
    expect(signals.some((s) => s.type === 'high_request_rate')).toBe(true);
  });

  it('should detect no JS execution', () => {
    const request: RequestContext = {
      ...baseRequest,
      jsExecuted: false,
    };

    const signals = detectSignals(request, DEFAULT_POLICY);
    expect(signals.some((s) => s.type === 'no_js_execution')).toBe(true);
  });

  it('should return empty signals for normal browser', () => {
    const signals = detectSignals(baseRequest, DEFAULT_POLICY);
    expect(signals.length).toBe(0);
  });

  it('should accumulate multiple signals', () => {
    const request: RequestContext = {
      ...baseRequest,
      userAgent: 'GPTBot/1.0',
      acceptLanguage: '',
      cookies: {},
      path: '/agent-honeypot',
    };

    const signals = detectSignals(request, DEFAULT_POLICY);
    expect(signals.length).toBeGreaterThanOrEqual(4);
  });
});

describe('isHoneypotPath', () => {
  it('should identify honeypot paths', () => {
    expect(isHoneypotPath('/agent-honeypot', DEFAULT_POLICY)).toBe(true);
    expect(isHoneypotPath('/bot-trap', DEFAULT_POLICY)).toBe(true);
    expect(isHoneypotPath('/internal-agent-policy', DEFAULT_POLICY)).toBe(true);
  });

  it('should reject non-honeypot paths', () => {
    expect(isHoneypotPath('/', DEFAULT_POLICY)).toBe(false);
    expect(isHoneypotPath('/about', DEFAULT_POLICY)).toBe(false);
    expect(isHoneypotPath('/products/123', DEFAULT_POLICY)).toBe(false);
  });
});
