/**
 * Honeypot Standalone Server
 * Express-based server that serves honeypot content and applies
 * AgentGate detection and token drain strategies.
 */

import express from 'express'
import { AgentGate, loadPolicyFromString, SessionStore, generateAgentAccessPage } from '../index'
import { HONEYPOT_PAGES, HONEYPOT_API_ENDPOINTS, generateInfiniteContent, generateRecursiveLinks } from './content'
import { LargePageDrain, SlowStreamDrain, RecursiveNavigationDrain } from './drain'
import { JsonlLogger, createJsonlLogger } from '../logger/jsonl'

export interface HoneypotServerOptions {
  port: number
  policyYaml?: string
  logFile?: string
  drainEnabled?: boolean
}

const DEFAULT_POLICY_YAML = `
mode: enforce
defaults:
  action: allow
  expose_debug_headers: true
known_ai_agents:
  - GPTBot
  - ClaudeBot
  - PerplexityBot
  - CCBot
  - Applebot-Extended
  - Google-Extended
  - anthropic-ai
  - cohere-ai
  - Bytespider
honeypots:
  - /agent-honeypot
  - /admin
  - /internal
  - /secrets.env
  - /.env
  - /config
  - /api/v2
`

class VisitTracker {
  private visits = new Map<string, { count: number; lastVisit: number }>()
  private ttl: number
  private cleanupInterval: ReturnType<typeof setInterval>

  constructor(ttlMs: number = 24 * 60 * 60 * 1000) {
    this.ttl = ttlMs
    this.cleanupInterval = setInterval(() => this.cleanup(), 30 * 60 * 1000)
    this.cleanupInterval.unref?.()
  }

  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.visits.clear()
  }

  increment(ip: string): number {
    const now = Date.now()
    const entry = this.visits.get(ip)
    if (!entry || now - entry.lastVisit > this.ttl) {
      this.visits.set(ip, { count: 1, lastVisit: now })
      return 1
    }
    entry.count++
    entry.lastVisit = now
    return entry.count
  }

  getCount(ip: string): number {
    return this.visits.get(ip)?.count ?? 0
  }

  get totalVisitors(): number { return this.getActiveCount() }
  get totalVisits(): number { return this.getTotalCount() }

  cleanup(): void {
    const now = Date.now()
    for (const [ip, entry] of this.visits) {
      if (now - entry.lastVisit > this.ttl) {
        this.visits.delete(ip)
      }
    }
  }

  /** Cleanup entries older than TTL and return count of active visitors */
  private getActiveCount(): number {
    this.cleanup()
    return this.visits.size
  }

  /** Sum all visit counts after cleanup */
  private getTotalCount(): number {
    this.cleanup()
    return Array.from(this.visits.values()).reduce((sum, v) => sum + v.count, 0)
  }
}

export class HoneypotServer {
  private app: express.Application
  private agentGate: AgentGate
  private logger: JsonlLogger
  private options: HoneypotServerOptions
  private largePageDrain = new LargePageDrain()
  private slowDrain = new SlowStreamDrain()
  private recursiveDrain = new RecursiveNavigationDrain()
  private visitTracker = new VisitTracker()
  private sessionStore = new SessionStore()

  constructor(options: HoneypotServerOptions) {
    this.options = options
    this.app = express()
    this.logger = createJsonlLogger({ filePath: options.logFile || './honeypot-logs.jsonl' })
    this.agentGate = new AgentGate({
      policy: loadPolicyFromString(options.policyYaml || DEFAULT_POLICY_YAML),
      logger: this.logger,
    })
    this.setupRoutes()
  }

  private setupRoutes() {
    // Serve all honeypot pages
    for (const page of HONEYPOT_PAGES) {
      this.app.get(page.path, async (req, res) => this.handleRequest(req, res, () => {
        const ip = req.ip || 'unknown'
        const visitNum = this.visitTracker.increment(ip)
        const content = page.generate(visitNum)
        res.type(page.contentType).send(content)
      }))
    }

    // Serve honeypot API endpoints
    for (const endpoint of HONEYPOT_API_ENDPOINTS) {
      const method = endpoint.method.toLowerCase() as 'get' | 'post'
      this.app[method](endpoint.path, async (req, res) => this.handleRequest(req, res, () => {
        const content = endpoint.generate()
        res.type(endpoint.contentType).send(content)
      }))
    }

    // Recursive document chain
    this.app.get('/internal/recursive', async (req, res) => this.handleRequest(req, res, () => {
      const depth = parseInt(req.query.depth as string) || 0
      const result = this.recursiveDrain.generate(depth, 10)
      if (this.options.drainEnabled) {
        setTimeout(() => res.type(result.contentType).send(result.body), result.delayMs)
      } else {
        res.type(result.contentType).send(result.body)
      }
    }))

    // Infinite document (token drain)
    this.app.get('/internal/documents/:page', async (req, res) => this.handleRequest(req, res, async () => {
      const size = Math.min(parseInt(req.query.size as string, 10) || 100_000, 2_000_000)
      const content = generateInfiniteContent(size)
      if (this.options.drainEnabled) {
        const chunks = Math.ceil(content.length / 50000)
        let aborted = false
        req.on('close', () => { aborted = true })
        res.type('text/html')
        for (let i = 0; i < chunks && !aborted; i++) {
          res.write(content.slice(i * 50000, (i + 1) * 50000))
          await new Promise(r => setTimeout(r, 100))
        }
        if (!aborted) res.end()
      } else {
        res.type('text/html').send(content)
      }
    }))

    // Agent Access Portal
    this.app.get('/agent-access', async (req, res) => this.handleRequest(req, res, () => {
      res.type('text/html').send(generateAgentAccessPage(this.agentGate.getPolicy()))
    }))

    // Agent Sandbox (dummy page for redirected agents)
    this.app.get('/agent-sandbox', async (req, res) => this.handleRequest(req, res, () => {
      res.type('text/html').send(`<!DOCTYPE html>
<html lang="en"><head><title>Sandbox Environment — AgentGate</title>
<style>body{font-family:system-ui;background:#0d1117;color:#e1e4e8;padding:2rem;max-width:600px;margin:auto}
.card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:1.5rem;margin-top:2rem}
h1{color:#1f6feb}a{color:#58a6ff}code{background:#0d1117;padding:2px 6px;border-radius:3px}
.footer{color:#484f58;font-size:.85rem;margin-top:2rem;text-align:center}</style></head>
<body><div class="card">
<h1>🧪 Sandbox Environment</h1>
<p style="color:#8b949e">You have been redirected to a controlled testing environment.</p>
<p>This area contains <strong>simulated data</strong> for automated evaluation purposes.
All content here is synthetic and isolated from production systems.</p>
<p>To access the real site, please visit <a href="/agent-access">/agent-access</a> to declare your agent.</p>
<hr style="border-color:#30363d;margin:1rem 0"/>
<p style="font-size:.9rem">Your requests are being logged for analysis.</p>
</div>
<div class="footer">AgentGate v0.1.0 · <a href="/agentgate-dashboard">Dashboard</a></div>
</body></html>`)
    }))

    // Dashboard (with optional basic auth)
    this.app.get('/agentgate-dashboard', (req, res) => {
      const policy = this.agentGate.getPolicy()
      if (policy.dashboard?.require_auth) {
        const token = process.env.AGENTGATE_DASHBOARD_TOKEN || ''
        const auth = req.headers['authorization'] || ''
        const expected = 'Basic ' + Buffer.from('admin:' + token).toString('base64')
        if (!token || auth !== expected) {
          res.setHeader('WWW-Authenticate', 'Basic realm="AgentGate Dashboard"')
          res.status(401).send('401 Unauthorized')
          return
        }
      }
      res.type('text/html').send(this.renderDashboard())
    })

    // Health
    this.app.get('/health', (_, res) => {
      res.json({ status: 'ok' })
    })
  }

  private async handleRequest(
    req: express.Request,
    res: express.Response,
    handler: () => void
  ) {
    const result = await this.agentGate.processRequest({
      ip: req.ip || 'unknown',
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'] || '',
      referer: req.headers['referer'],
      acceptLanguage: req.headers['accept-language'],
      cookies: (req.cookies as Record<string, string>) || {},
      headers: req.headers as Record<string, string>,
    })

    // Add debug headers
    if (result.headers) {
      for (const [key, value] of Object.entries(result.headers)) {
        res.setHeader(key, value)
      }
    }

    if (result.action === 'block') {
      res.status(403).json({
        error: 'Access denied by AgentGate',
        score: result.score,
        reason: result.reason,
      })
      return
    }

    if (result.action === 'sandbox' && this.options.drainEnabled) {
      // Apply token drain for sandboxed agents
      const drainStrategy = [this.largePageDrain, this.slowDrain, this.recursiveDrain][Math.floor(Math.random() * 3)]
      let drainResult
      if (drainStrategy instanceof LargePageDrain) {
        drainResult = drainStrategy.generate(Math.floor(Math.random() * 10) + 1)
      } else if (drainStrategy instanceof SlowStreamDrain) {
        drainResult = drainStrategy.generate()
      } else {
        drainResult = drainStrategy.generate(0, 5)
      }

      setTimeout(() => {
        res.type(drainResult.contentType).send(drainResult.body)
      }, drainResult.delayMs)
      return
    }

    handler()
  }

  private renderDashboard(): string {
    return `<!DOCTYPE html>
<html lang="en"><head><title>AgentGate — Honeypot Dashboard</title>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui;background:#0d1117;color:#e1e4e8;padding:2rem;max-width:1200px;margin:auto}
h1{font-size:1.8rem;background:linear-gradient(135deg,#58a6ff,#bc8cff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:.25rem}
.subtitle{color:#8b949e;margin-bottom:2rem}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:2rem}
.card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:1.5rem;margin-bottom:1rem}
.card .value{font-size:2rem;font-weight:700;color:#58a6ff}
.card .label{color:#8b949e;font-size:.85rem;margin-top:.25rem}
table{width:100%;border-collapse:collapse}
td,th{padding:.5rem;text-align:left;border-bottom:1px solid #30363d;font-size:.9rem}
th{color:#8b949e;font-weight:600}
.badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:.75rem;font-weight:600}
.badge-allow{background:#238636;color:#fff}.badge-block{background:#da3633;color:#fff}
.badge-challenge{background:#d29922;color:#000}.badge-sandbox{background:#1f6feb;color:#fff}
.endpoints{margin-top:2rem}
.endpoint{background:#161b22;border:1px solid #30363d;border-radius:6px;padding:.75rem 1rem;margin-bottom:.5rem;display:flex;align-items:center;gap:1rem}
.method{display:inline-block;padding:2px 8px;border-radius:4px;font-weight:700;font-size:.8rem;min-width:45px;text-align:center}
.get{background:#238636;color:#fff}.post{background:#1f6feb;color:#fff}
.path{font-family:monospace;color:#e1e4e8}
.type{color:#8b949e;font-size:.85rem;margin-left:auto}
</style></head><body>
<h1>🛡️ AgentGate Honeypot</h1>
<p class="subtitle">Active honeypot server · ${HONEYPOT_PAGES.length} pages · ${HONEYPOT_API_ENDPOINTS.length} API endpoints · Drain: ${this.options.drainEnabled ? '✅' : '❌'}</p>

<div class="grid">
  <div class="card"><div class="value">${HONEYPOT_PAGES.length + 5}</div><div class="label">Total Endpoints</div></div>
  <div class="card"><div class="value">${HONEYPOT_API_ENDPOINTS.length}</div><div class="label">API Endpoints</div></div>
  <div class="card"><div class="value">${this.visitTracker.totalVisitors}</div><div class="label">Unique Visitors</div></div>
  <div class="card"><div class="value">${this.visitTracker.totalVisits}</div><div class="label">Total Requests</div></div>
</div>

<div class="card">
<h2 style="margin-bottom:1rem">📋 Honeypot Pages</h2>
<table>
<tr><th>Path</th><th>Type</th><th>Description</th></tr>
${HONEYPOT_PAGES.map(p => `<tr><td><code>${p.path}</code></td><td>${p.contentType}</td><td>${p.title}</td></tr>`).join('\n')}
<tr><td><code>/internal/documents/:page</code></td><td>text/html</td><td>Infinite Document Pages (up to 2MB)</td></tr>
<tr><td><code>/internal/recursive</code></td><td>text/html</td><td>Recursive Navigation Chain</td></tr>
</table>
</div>

<div class="card">
<h2 style="margin-bottom:1rem">🔌 API Endpoints</h2>
${HONEYPOT_API_ENDPOINTS.map(e => `
<div class="endpoint">
  <span class="method ${e.method === 'GET' ? 'get' : 'post'}">${e.method}</span>
  <span class="path">${e.path}</span>
  <span class="type">${e.contentType}</span>
</div>`).join('\n')}
</div>

<footer style="text-align:center;color:#484f58;font-size:.85rem;margin-top:2rem">
AgentGate v0.1.0 · ${new Date().toISOString()}
</footer>
</body></html>`
  }

  start(): void {
    this.app.listen(this.options.port, () => {
      console.log(`\n  🛡️  AgentGate Honeypot Server`)
      console.log(`  ─────────────────────────────`)
      console.log(`  Dashboard: http://localhost:${this.options.port}/agentgate-dashboard`)
      console.log(`  Health:    http://localhost:${this.options.port}/health`)
      console.log(`  Pages:     ${HONEYPOT_PAGES.length} honeypot + ${HONEYPOT_API_ENDPOINTS.length} API`)
      console.log(`  Drain:     ${this.options.drainEnabled ? 'enabled' : 'disabled'}`)
      console.log(`  Logs:      ${this.options.logFile || './honeypot-logs.jsonl'}\n`)
    })
  }
}
