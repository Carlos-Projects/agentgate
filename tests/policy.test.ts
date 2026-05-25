import { describe, it, expect } from 'vitest';
import { loadPolicyFromString, getActionForPath, getActionForAgent } from '../src/core/policy';

describe('loadPolicyFromString', () => {
  it('should load valid YAML policy', () => {
    const yaml = `
mode: enforce
defaults:
  action: allow
  expose_debug_headers: false
known_ai_agents:
  - TestBot
honeypots:
  - /test-honeypot
`;

    const policy = loadPolicyFromString(yaml);
    expect(policy.mode).toBe('enforce');
    expect(policy.defaults.expose_debug_headers).toBe(false);
    expect(policy.known_ai_agents).toContain('TestBot');
    expect(policy.honeypots).toContain('/test-honeypot');
  });

  it('should use defaults for missing fields', () => {
    const yaml = `
mode: log_only
`;

    const policy = loadPolicyFromString(yaml);
    expect(policy.mode).toBe('log_only');
    expect(policy.defaults.action).toBe('allow');
    expect(policy.known_ai_agents.length).toBeGreaterThan(0);
  });

  it('should handle invalid YAML gracefully', () => {
    const yaml = 'invalid: yaml: content: [';
    const policy = loadPolicyFromString(yaml);
    expect(policy.mode).toBe('log_only'); // Falls back to default
  });
});

describe('getActionForPath', () => {
  const policy = loadPolicyFromString(`
paths:
  /admin/*:
    action: block
  /api/*:
    action: challenge
  /pricing:
    action: limited
`);

  it('should match exact paths', () => {
    expect(getActionForPath('/pricing', policy)).toBe('limited');
  });

  it('should match prefix patterns', () => {
    expect(getActionForPath('/admin/', policy)).toBe('block');
    expect(getActionForPath('/admin/users', policy)).toBe('block');
    expect(getActionForPath('/api/v1/test', policy)).toBe('challenge');
  });

  it('should return null for unmatched paths', () => {
    expect(getActionForPath('/about', policy)).toBe(null);
    expect(getActionForPath('/blog/post', policy)).toBe(null);
  });
});

describe('getActionForAgent', () => {
  const policy = loadPolicyFromString(`
approved_agents:
  - name: Googlebot
    action: allow
  - name: Bingbot
    action: allow
  - name: TestBot
    action: limited
`);

  it('should match approved agents', () => {
    expect(getActionForAgent('Googlebot/1.0', policy)).toBe('allow');
    expect(getActionForAgent('Bingbot/2.0', policy)).toBe('allow');
  });

  it('should match partial user agent strings', () => {
    expect(getActionForAgent('Mozilla/5.0 (compatible; Googlebot/2.1)', policy)).toBe('allow');
  });

  it('should return null for unknown agents', () => {
    expect(getActionForAgent('UnknownBot/1.0', policy)).toBe(null);
  });
});
