import { describe, it, expect } from 'vitest';
import {
  AgentGate,
  DEFAULT_POLICY,
  loadPolicyFromString,
} from '../src/index';

describe('AgentGate', () => {
  it('should create instance with default policy', () => {
    const gate = new AgentGate({ policy: DEFAULT_POLICY });
    expect(gate).toBeInstanceOf(AgentGate);
    expect(gate.getPolicy()).toBeDefined();
  });

  it('should allow normal requests by default', async () => {
    const gate = new AgentGate({ policy: DEFAULT_POLICY });
    const result = await gate.processRequest({
      ip: '192.168.1.1',
      path: '/',
      method: 'GET',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      cookies: { session: 'abc' },
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'accept-language': 'en-US',
      },
    });
    expect(result.action).toBe('allow');
    expect(result.score).toBe(0);
  });

  it('should detect known AI agents', async () => {
    const gate = new AgentGate({ policy: DEFAULT_POLICY });
    const result = await gate.processRequest({
      ip: '10.0.0.1',
      path: '/',
      method: 'GET',
      userAgent: 'Mozilla/5.0 GPTBot/1.0',
      cookies: {},
      headers: {
        'user-agent': 'Mozilla/5.0 GPTBot/1.0',
      },
    });
    expect(result.signals).toContain('known_ai_user_agent');
    expect(result.score).toBeGreaterThan(0);
  });

  it('should detect honeypot hits', async () => {
    const gate = new AgentGate({ policy: DEFAULT_POLICY });
    const result = await gate.processRequest({
      ip: '10.0.0.1',
      path: '/agent-honeypot',
      method: 'GET',
      userAgent: 'SomeBot/1.0',
      cookies: {},
      headers: { 'user-agent': 'SomeBot/1.0' },
    });
    expect(result.signals).toContain('honeypot_hit');
    expect(result.score).toBeGreaterThanOrEqual(50);
  });

  it('should load policy from YAML string', () => {
    const yaml = `
mode: enforce
defaults:
  action: allow
  expose_debug_headers: false
known_ai_agents:
  - CustomBot
honeypots:
  - /custom-trap
`;
    const policy = loadPolicyFromString(yaml);
    expect(policy.mode).toBe('enforce');
    expect(policy.defaults.expose_debug_headers).toBe(false);
    expect(policy.known_ai_agents).toContain('CustomBot');
    expect(policy.honeypots).toContain('/custom-trap');
  });

  it('should block requests over threshold', async () => {
    const gate = new AgentGate({ policy: DEFAULT_POLICY });
    const result = await gate.processRequest({
      ip: '10.0.0.1',
      path: '/agent-honeypot',
      method: 'GET',
      userAgent: 'GPTBot/1.0',
      cookies: {},
      headers: { 'user-agent': 'GPTBot/1.0' },
    });
    // Honeypot (50) + known_ai (25) = 75 >= 70 (sandbox)
    expect(result.action).toBe('sandbox');
    expect(result.score).toBeGreaterThanOrEqual(70);
  });
});
