import { describe, it, expect } from 'vitest';
import { StaticHoneypotGenerator } from '../src/honeypot/static';
import { DynamicHoneypotGenerator } from '../src/honeypot/dynamic';
import { DEFAULT_POLICY } from '../src/core/types';

describe('StaticHoneypotGenerator', () => {
  const generator = new StaticHoneypotGenerator(DEFAULT_POLICY);

  it('should generate honeypot URLs', () => {
    const url = generator.generateUrl();
    expect(url).toMatch(/^\/(agent-honeypot|bot-trap|internal-agent-policy|scrape-check)/);
  });

  it('should validate known honeypot tokens', () => {
    expect(generator.validateToken('agent-honeypot')).toBe(true);
    expect(generator.validateToken('bot-trap')).toBe(true);
  });

  it('should identify honeypot paths', () => {
    expect(generator.isHoneypotPath('/agent-honeypot')).toBe(true);
    expect(generator.isHoneypotPath('/bot-trap')).toBe(true);
    expect(generator.isHoneypotPath('/about')).toBe(false);
  });

  it('should allow adding custom honeypots', () => {
    generator.addHoneypot('/custom-trap');
    expect(generator.isHoneypotPath('/custom-trap')).toBe(true);
  });
});

describe('DynamicHoneypotGenerator', () => {
  const generator = new DynamicHoneypotGenerator({
    secret: 'test-secret',
    expiryMs: 3600000,
  });

  it('should generate tokenized URLs', () => {
    const url = generator.generateUrl();
    expect(url).toMatch(/^\/\.well-known\/agent-trap\//);
  });

  it('should validate generated tokens', () => {
    const url = generator.generateUrl();
    const token = url.split('/').pop()!;
    expect(generator.validateToken(token)).toBe(true);
  });

  it('should reject invalid tokens', () => {
    expect(generator.validateToken('invalid-token')).toBe(false);
    expect(generator.validateToken('')).toBe(false);
  });

  it('should reject expired tokens', async () => {
    const expiredGenerator = new DynamicHoneypotGenerator({
      secret: 'test-secret',
      expiryMs: 1,
    });

    const url = expiredGenerator.generateUrl();
    const token = url.split('/').pop()!;

    await new Promise(r => setTimeout(r, 20))
    expect(expiredGenerator.validateToken(token)).toBe(false);
  });

  it('should identify honeypot paths', () => {
    expect(generator.isHoneypotPath('/.well-known/agent-trap/abc123')).toBe(true);
    expect(generator.isHoneypotPath('/about')).toBe(false);
  });

  it('should allow changing secret', () => {
    generator.setSecret('new-secret');
    const url = generator.generateUrl();
    const token = url.split('/').pop()!;
    expect(generator.validateToken(token)).toBe(true);
  });
});
