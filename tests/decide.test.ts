import { describe, it, expect } from 'vitest';
import { decide } from '../src/core/decide';
import { loadPolicyFromString } from '../src/core/policy';
import { detectSignals } from '../src/core/detect';
import { normalizeRequest } from '../src/core/normalize';

describe('decide', () => {
  const policy = loadPolicyFromString(`
mode: enforce
defaults:
  action: allow
  expose_debug_headers: true
paths:
  /admin/*:
    action: block
  /api/*:
    action: challenge
approved_agents:
  - name: Googlebot
    action: allow
`);

  it('should allow low-score requests', () => {
    const request = normalizeRequest({
      ip: '192.168.1.1',
      path: '/about',
      method: 'GET',
      userAgent: 'Mozilla/5.0',
      acceptLanguage: 'en-US',
      cookies: { session: 'abc' },
      headers: {},
    });

    const signals = detectSignals(request, policy);
    const score = 15; // Simulated low score
    const result = decide(score, signals, request.path, request.userAgent, policy);

    expect(result.action).toBe('allow');
    expect(result.score).toBe(15);
  });

  it('should block high-score requests', () => {
    const request = normalizeRequest({
      ip: '192.168.1.1',
      path: '/',
      method: 'GET',
      userAgent: 'GPTBot/1.0',
      cookies: {},
      headers: {},
    });

    const signals = detectSignals(request, policy);
    const result = decide(95, signals, request.path, request.userAgent, policy);

    expect(result.action).toBe('block');
    expect(result.headers).toBeDefined();
    expect(result.headers!['X-AgentGate-Score']).toBe('95');
  });

  it('should redirect to challenge for medium scores', () => {
    const request = normalizeRequest({
      ip: '192.168.1.1',
      path: '/',
      method: 'GET',
      userAgent: 'UnknownBot/1.0',
      cookies: {},
      headers: {},
    });

    const signals = detectSignals(request, policy);
    const result = decide(60, signals, request.path, request.userAgent, policy);

    expect(result.action).toBe('challenge');
    expect(result.redirectPath).toBe('/agent-access');
  });

  it('should redirect to sandbox for high-medium scores', () => {
    const signals = detectSignals(normalizeRequest({
      ip: '192.168.1.1',
      path: '/',
      method: 'GET',
      userAgent: 'GPTBot/1.0',
      cookies: {},
      headers: {},
    }), policy);

    const result = decide(75, signals, '/', 'GPTBot/1.0', policy);

    expect(result.action).toBe('sandbox');
    expect(result.redirectPath).toBe('/agent-sandbox');
  });

  it('should respect path-specific rules', () => {
    const signals = detectSignals(normalizeRequest({
      ip: '192.168.1.1',
      path: '/admin/dashboard',
      method: 'GET',
      userAgent: 'Mozilla/5.0',
      acceptLanguage: 'en-US',
      cookies: { session: 'abc' },
      headers: {},
    }), policy);

    const result = decide(10, signals, '/admin/dashboard', 'Mozilla/5.0', policy);

    expect(result.action).toBe('block'); // Path rule overrides low score
    expect(result.reason).toContain('Path policy');
  });

  it('should respect agent-specific rules over path rules', () => {
    // Googlebot is approved, so even though /api/* has challenge action,
    // the agent rule should take priority
    const signals = detectSignals(normalizeRequest({
      ip: '192.168.1.1',
      path: '/api/data',
      method: 'GET',
      userAgent: 'Googlebot/2.1',
      acceptLanguage: 'en-US',
      cookies: { session: 'abc' },
      headers: {},
    }), policy);

    const result = decide(25, signals, '/api/data', 'Googlebot/2.1', policy);

    // Agent rule should override path rule
    expect(result.action).toBe('allow');
    expect(result.reason).toContain('Agent policy');
  });

  it('should use log_only mode', () => {
    const logOnlyPolicy = loadPolicyFromString(`
mode: log_only
defaults:
  action: allow
`);

    const signals = detectSignals(normalizeRequest({
      ip: '192.168.1.1',
      path: '/',
      method: 'GET',
      userAgent: 'GPTBot/1.0',
      cookies: {},
      headers: {},
    }), logOnlyPolicy);

    const result = decide(95, signals, '/', 'GPTBot/1.0', logOnlyPolicy);

    expect(result.action).toBe('log_only'); // Even high score is logged only
    expect(result.reason).toContain('Log-only mode');
  });

  it('should include debug headers when enabled', () => {
    const signals = detectSignals(normalizeRequest({
      ip: '192.168.1.1',
      path: '/',
      method: 'GET',
      userAgent: 'Mozilla/5.0',
      acceptLanguage: 'en-US',
      cookies: { session: 'abc' },
      headers: {},
    }), policy);

    const result = decide(45, signals, '/', 'Mozilla/5.0', policy);

    expect(result.headers).toBeDefined();
    expect(result.headers!['X-AgentGate-Score']).toBe('45');
    expect(result.headers!['X-AgentGate-Action']).toBe('limited');
  });
});
