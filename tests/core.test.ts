import { describe, it, expect } from 'vitest';
import { AgentGate, createAgentGate, loadPolicyFromString, createJsonlLogger } from '../src/index';

describe('AgentGate', () => {
  const policy = loadPolicyFromString(`
mode: enforce
defaults:
  action: allow
  expose_debug_headers: true
known_ai_agents:
  - GPTBot
  - ClaudeBot
honeypots:
  - /agent-honeypot
`);

  const logger = createJsonlLogger({ filePath: '/tmp/agentgate-test.jsonl' });

  const agentGate = createAgentGate({
    policy,
    logger,
  });

  it('should allow normal requests by default', async () => {
    const result = await agentGate.processRequest({
      ip: '192.168.1.1',
      path: '/about',
      method: 'GET',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      acceptLanguage: 'en-US,en;q=0.9',
      cookies: { session: 'abc123' },
      headers: {},
      jsExecuted: true,
    });

    expect(result.action).toBe('allow');
    // Score may be > 0 if some signals detected, but should be low
    expect(result.score).toBeLessThan(30);
  });

  it('should detect and score AI agents', async () => {
    const result = await agentGate.processRequest({
      ip: '192.168.1.1',
      path: '/blog',
      method: 'GET',
      userAgent: 'GPTBot/1.0',
      acceptLanguage: 'en-US',
      cookies: {},
      headers: {},
    });

    expect(result.score).toBeGreaterThan(0);
    expect(result.signals).toContain('known_ai_user_agent');
  });

  it('should sandbox high-score requests', async () => {
    const result = await agentGate.processRequest({
      ip: '192.168.1.1',
      path: '/agent-honeypot', // Honeypot = 50 points
      method: 'GET',
      userAgent: 'GPTBot/1.0', // Known AI = 25 points
      acceptLanguage: 'en-US', // Avoid missing_accept_language penalty
      cookies: {}, // Missing cookies = 8 points
      headers: {},
    });

    // Honeypot (50) + known_ai (25) + missing_cookies (8) = 83
    // 83 is in sandbox range (70-89)
    expect(result.action).toBe('sandbox');
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.score).toBeLessThan(90);
  });

  it('should respect path-specific rules', async () => {
    const policyWithPath = loadPolicyFromString(`
mode: enforce
defaults:
  action: allow
paths:
  /admin/*:
    action: block
`);

    const gate = createAgentGate({ policy: policyWithPath, logger });

    const result = await gate.processRequest({
      ip: '192.168.1.1',
      path: '/admin/dashboard',
      method: 'GET',
      userAgent: 'Mozilla/5.0',
      acceptLanguage: 'en-US',
      cookies: { session: 'abc' },
      headers: {},
    });

    expect(result.action).toBe('block');
    expect(result.reason).toContain('Path policy');
  });

  it('should provide redirect for challenge action', async () => {
    const policyWithChallenge = loadPolicyFromString(`
mode: enforce
defaults:
  action: allow
paths:
  /api/*:
    action: challenge
`);

    const gate = createAgentGate({ policy: policyWithChallenge, logger });

    const result = await gate.processRequest({
      ip: '192.168.1.1',
      path: '/api/data',
      method: 'GET',
      userAgent: 'Mozilla/5.0',
      acceptLanguage: 'en-US',
      cookies: { session: 'abc' },
      headers: {},
    });

    expect(result.action).toBe('challenge');
    expect(result.redirectPath).toBe('/agent-access');
  });

  it('should update policy dynamically', async () => {
    const gate = createAgentGate({ policy, logger });

    gate.updatePolicy({ mode: 'log_only' });

    const result = await gate.processRequest({
      ip: '192.168.1.1',
      path: '/',
      method: 'GET',
      userAgent: 'GPTBot/1.0',
      acceptLanguage: 'en-US',
      cookies: {},
      headers: {},
    });

    // In log_only mode, even high scores become log_only
    expect(result.action).toBe('log_only');
  });
});
