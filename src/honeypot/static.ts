/**
 * Static Honeypot Generator
 * Generates and validates static honeypot URLs
 */

import { HoneypotGenerator } from '../core/types';
import { AgentPolicy } from '../core/types';

export class StaticHoneypotGenerator implements HoneypotGenerator {
  private honeypots: string[];

  constructor(policy: AgentPolicy) {
    this.honeypots = policy.honeypots || [
      '/agent-honeypot',
      '/bot-trap',
      '/internal-agent-policy',
      '/scrape-check',
    ];
  }

  generateUrl(context?: { index?: number }): string {
    const index = context?.index ?? Math.floor(Math.random() * this.honeypots.length);
    return this.honeypots[index % this.honeypots.length];
  }

  validateToken(token: string): boolean {
    // For static honeypots, any known honeypot path is valid
    return this.honeypots.some((hp) => hp.includes(token));
  }

  isHoneypotPath(path: string): boolean {
    return this.honeypots.some((hp) => path.startsWith(hp));
  }

  getHoneypots(): string[] {
    return [...this.honeypots];
  }

  addHoneypot(path: string): void {
    if (!this.honeypots.includes(path)) {
      this.honeypots.push(path);
    }
  }
}

export function createStaticHoneypotGenerator(policy: AgentPolicy): StaticHoneypotGenerator {
  return new StaticHoneypotGenerator(policy);
}
