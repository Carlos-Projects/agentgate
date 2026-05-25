import * as crypto from 'crypto'
import * as http from 'http'
import * as https from 'https'

export interface WebhookTarget {
  name: string
  url: string
  secret?: string
  events: string[]
}

export interface WebhookConfig {
  enabled: boolean
  targets: WebhookTarget[]
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
        const url = new URL(target.url)
        const isHttps = url.protocol === 'https:'
        const lib = isHttps ? https : http

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

        const req = lib.request(
          url,
          {
            method: 'POST',
            headers,
            timeout: 10_000,
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
