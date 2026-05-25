export interface WebhookConfig {
  enabled: boolean
  targets: Array<{
    name: string
    url: string
    secret?: string
    events: string[]
  }>
}

export class WebhookSender {
  constructor(_config: WebhookConfig) {}
  async send(_event: string, _payload: unknown): Promise<void> {}
  async close(): Promise<void> {}
}
