/**
 * Dynamic Honeypot Generator
 * Generates time-limited honeypot URLs with HMAC tokens
 */

import * as crypto from 'crypto';
import { HoneypotGenerator } from '../core/types';

export interface DynamicHoneypotOptions {
  secret?: string;
  expiryMs?: number;
  basePath?: string;
}

export class DynamicHoneypotGenerator implements HoneypotGenerator {
  private options: Required<DynamicHoneypotOptions>;

  constructor(options: DynamicHoneypotOptions = {}) {
    if (!options.secret || options.secret.length < 16) {
      throw new Error(
        'DynamicHoneypotGenerator: a unique secret (min 16 chars) is required. '
        + 'Set via `new DynamicHoneypotGenerator({ secret: "your-secret" })`'
      )
    }
    this.options = {
      secret: options.secret,
      expiryMs: options.expiryMs ?? 3_600_000,
      basePath: options.basePath ?? '/.well-known/agent-trap',
    };
  }

  generateUrl(context?: { data?: string }): string {
    const timestamp = Date.now();
    const data = context?.data || '';
    const payload = `${timestamp}:${data}`;
    const signature = this.sign(payload);
    const token = Buffer.from(`${payload}:${signature}`).toString('base64');

    return `${this.options.basePath}/${token}`;
  }

  validateToken(token: string): boolean {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const parts = decoded.split(':');

      if (parts.length < 3) {
        return false;
      }

      const signature = parts.pop()!;
      const payload = parts.join(':');
      const timestamp = parseInt(parts[0], 10);

      // Check expiry
      if (Date.now() - timestamp > this.options.expiryMs) {
        return false;
      }

      // Verify signature
      const expectedSignature = this.sign(payload);
      return signature === expectedSignature;
    } catch {
      return false;
    }
  }

  isHoneypotPath(path: string): boolean {
    return path.startsWith(this.options.basePath);
  }

  private sign(payload: string): string {
    return crypto
      .createHmac('sha256', this.options.secret)
      .update(payload)
      .digest('hex');
  }

  setSecret(secret: string): void {
    this.options.secret = secret;
  }
}

export function createDynamicHoneypotGenerator(
  options?: DynamicHoneypotOptions
): DynamicHoneypotGenerator {
  return new DynamicHoneypotGenerator(options);
}
