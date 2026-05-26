import * as crypto from 'crypto'
import * as https from 'https'
import * as net from 'net'

export interface WebhookTarget {
  name: string
  url: string
  secret?: string
  events: string[]
  timeout_ms?: number
}

export interface WebhookConfig {
  enabled: boolean
  targets: WebhookTarget[]
}

function isPrivateIP(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true
  if (net.isIP(hostname)) {
    const parts = hostname.split('.').map(Number)
    if (parts[0] === 10) return true
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
    if (parts[0] === 192 && parts[1] === 168) return true
    if (parts[0] === 127) return true
    if (parts[0] === 0) return true
  }
  return false
}

function validateUrl(url: string): URL | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  if (parsed.protocol !== 'https:') return null

  if (isPrivateIP(parsed.hostname)) return null

  return parsed
}

export class WebhookSender {
  private config: WebhookConfig

  constructor(config: WebhookConfig) {
    this.config = config
  }

  async send(event: string, payload: unknown): Promise<void> {
    if (!this.config.enabled) return

    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    })

    const promises = this.config.targets
      .filter(t => t.events.includes(event) || t.events.includes('*'))
      .map(target => this.deliver(target, body))

    await Promise.allSettled(promises)
  }

  private deliver(target: WebhookTarget, body: string): Promise<void> {
    return new Promise((resolve) => {
      try {
        const url = validateUrl(target.url)
        if (!url) {
          resolve()
          return
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body).toString(),
          'User-Agent': 'AgentGate-Webhook/1.0',
        }

        if (target.secret) {
          const signature = crypto
            .createHmac('sha256', target.secret)
            .update(body)
            .digest('hex')
          headers['X-Signature-256'] = signature
        }

        const timeout = target.timeout_ms || 5_000

        const req = https.request(
          url,
          {
            method: 'POST',
            headers,
            timeout,
            rejectUnauthorized: true,
          },
          (res) => {
            res.resume()
            resolve()
          }
        )

        req.on('error', () => resolve())
        req.on('timeout', () => {
          req.destroy()
          resolve()
        })

        req.write(body)
        req.end()
      } catch {
        resolve()
      }
    })
  }

  async close(): Promise<void> {
  }
}
