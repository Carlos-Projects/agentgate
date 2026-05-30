# AgentGate 🔥

[![CI](https://img.shields.io/github/actions/workflow/status/Carlos-Projects/agentgate/ci.yml?branch=main&logo=github)](https://github.com/Carlos-Projects/agentgate/actions)
[![npm version](https://img.shields.io/npm/v/agentgate-firewall?logo=npm)](https://www.npmjs.com/package/agentgate-firewall)
[![TypeScript](https://img.shields.io/badge/types-TypeScript-blue?logo=typescript)](https://www.typescriptlang.org)
[![License](https://img.shields.io/github/license/Carlos-Projects/agentgate?logo=opensourceinitiative)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/Carlos-Projects/agentgate?style=social)](https://github.com/Carlos-Projects/agentgate)
[![Star History](https://img.shields.io/badge/Star-History-blue?style=social)](https://api.star-history.com/svg?repos=Carlos-Projects/agentgate&type=Date)

**Policy-based firewall and honeypot middleware for AI agents accessing websites**

> Palisade scans content before agents read it.
> MCPwn attacks tool servers before agents trust them.
> **AgentGate protects websites when agents visit them.**
> MCPscop centralizes the findings.

AgentGate provides a programmable perimeter for controlling how AI agents, crawlers, and automated systems access your web content. It detects automated traffic, scores risk, enforces policies, and provides observability — all without expensive infrastructure.

**Use case:** You run a website. AI agents are scraping, browsing, and interacting with it. You want to allow good agents, sandbox suspicious ones, and block hostile automation — without breaking the experience for human visitors.

---

## What makes AgentGate unique

| Capability | What it does | Why it matters |
|---|---|---|
| **Multi-signal detection** | Combines user-agent, headers, behavior, rate limiting | No single point of failure for evasion |
| **Graduated responses** | allow → limited → challenge → sandbox → block | Proportional response based on risk |
| **Framework-native** | Adapters for Next.js, Express, Cloudflare Workers | Drop into any stack |
| **Privacy-first** | IP hashing by default (GDPR-friendly) | No PII storage by default |

---

## Features

### Core Protection
- **Multi-signal detection**: Combines user-agent, headers, behavior, and rate limiting
- **Policy-driven control**: YAML-based configuration for approved/denied missions
- **Risk scoring**: 0-100 score based on configurable signal weights
- **Graduated responses**: allow, limited, challenge, sandbox, block
- **Real rate limiting**: Sliding window with multi-key checking (IP, path, session)
- **Session tracking**: Behavioral analysis with fingerprint fallback

### Advanced Features
- **Honeypot system**: Static and dynamic trap URLs for bot detection
- **Privacy-first**: IP hashing by default (GDPR-friendly)
- **Webhook notifications**: Real-time alerts for critical events
- **JSONL logging**: Portable, queryable audit trail
- **Dashboard**: Built-in analytics with authentication
- **Framework adapters**: Next.js, Express, Cloudflare Workers

---

## Quick Start

### Installation

```bash
npm install agentgate-firewall
```

### Basic Setup (Next.js)

1. Create `agent-policy.yaml` in your project root:

```yaml
mode: log_only

defaults:
  action: allow
  expose_debug_headers: true

privacy:
  hash_ip: true
  log_raw_ip: false

rate_limit:
  enabled: true
  store: memory  # Use "redis" for production
  failure_mode: open
  rules:
    default:
      window_ms: 60000
      max_requests: 60
      action: limited

session:
  enabled: true
  ttl_ms: 1800000
  fallback_ttl_ms: 600000
  cookie_name: "agentgate_sid"
  cookie_secure: false  # Set true in production
  track_paths: true
  max_paths: 50

dashboard:
  enabled: true
  require_auth: true

known_ai_agents:
  - GPTBot
  - ClaudeBot
  - PerplexityBot
```

2. Add middleware:

```typescript
// middleware.ts
import { createAgentGate, loadPolicy, createJsonlLogger } from 'agentgate-firewall'

const policy = loadPolicy('./agent-policy.yaml')
const agentGate = createAgentGate({
  policy,
  logger: createJsonlLogger(),
})

export async function middleware(request: NextRequest) {
  const result = await agentGate.processRequest({
    ip: request.headers.get('x-forwarded-for') || 'unknown',
    path: request.nextUrl.pathname,
    method: request.method,
    userAgent: request.headers.get('user-agent') || '',
    cookies: Object.fromEntries(request.cookies),
    headers: Object.fromEntries(request.headers),
  })

  if (result.action === 'block') {
    return new NextResponse('Blocked', { status: 403 })
  }

  if (result.redirectPath) {
    return NextResponse.redirect(result.redirectPath)
  }

  return NextResponse.next()
}
```

3. Run your Next.js app and visit `/agentgate-dashboard` to see analytics.

---

## Configuration

### Policy Format

See [config/agent-policy.example.yaml](config/agent-policy.example.yaml) for full options.

```yaml
# Mode: log_only (observe) or enforce (block)
mode: log_only

# Privacy settings (GDPR-friendly)
privacy:
  hash_ip: true
  log_raw_ip: false

# Rate limiting
rate_limit:
  enabled: true
  store: memory  # or "redis" (requires @upstash/redis)
  failure_mode: open  # open | challenge | block
  rules:
    default:
      window_ms: 60000
      max_requests: 60
      action: limited
    suspected_agent:
      window_ms: 60000
      max_requests: 20
      action: sandbox
    honeypot_hit:
      window_ms: 60000
      max_requests: 1
      action: block
    paths:
      "/api/*":
        window_ms: 60000
        max_requests: 20
        action: challenge

# Session tracking
session:
  enabled: true
  ttl_ms: 1800000           # 30 min for cookie sessions
  fallback_ttl_ms: 600000   # 10 min for fingerprint fallback
  cookie_name: "agentgate_sid"
  cookie_secure: true
  cookie_same_site: "Lax"
  track_paths: true
  max_paths: 50

# Dashboard authentication
dashboard:
  enabled: true
  require_auth: true

# Webhook notifications
webhooks:
  enabled: true
  targets:
    - name: "security-alerts"
      url: "${AGENTGATE_WEBHOOK_URL}"
      events:
        - "honeypot_hit"
        - "critical_score"
        - "blocked"
      secret: "${AGENTGATE_WEBHOOK_SECRET}"
      timeout_ms: 3000

# Scoring configuration
scoring:
  weights:
    known_ai_user_agent: 25
    honeypot_hit: 50
    high_request_rate: 20
  thresholds:
    allow: 0
    limited: 30
    challenge: 55
    sandbox: 70
    block: 90
```

## Actions

| Action | Description |
|--------|-------------|
| `allow` | Normal access |
| `limited` | Access with restrictions/headers |
| `challenge` | Redirect to declaration page |
| `sandbox` | Redirect to controlled environment |
| `block` | Return 403 |
| `log_only` | Log without interfering |

## Rate Limiting

AgentGate implements **real sliding window** rate limiting with multi-key checking:

### Multi-Key Strategy
- `ip:{hash}` - Global IP limit
- `ip_path:{ip}:{path}` - Per-path limit
- `session:{id}` - Session-based limit
- `ua:{hash}` - User-Agent limit

### Storage Options

**Memory (Development)**
```yaml
rate_limit:
  enabled: true
  store: memory
```

⚠️ **Warning**: Memory store is for development/demo only. Not suitable for production high-traffic.

**Redis (Production)**
```yaml
rate_limit:
  enabled: true
  store: redis

# Set environment variables:
# AGENTGATE_REDIS_URL=your-redis-url
# AGENTGATE_REDIS_TOKEN=your-redis-token
```

Install Redis adapter:
```bash
npm install @upstash/redis
```

### Failure Modes

```yaml
rate_limit:
  failure_mode: open  # or "challenge" or "block"
```

- `open`: Allow requests if store fails (dev-friendly)
- `challenge`: Require challenge if store fails (production recommended)
- `block`: Block requests if store fails (maximum security)

**Default**: `open` in development, `challenge` in production

## Session Tracking

AgentGate tracks user sessions to detect behavioral patterns:

### Features
- **Cookie-based sessions**: 30-minute TTL (configurable)
- **Fingerprint fallback**: 10-minute TTL for users without cookies
- **Path tracking**: Detects repeated patterns (e.g., /product/1, /product/2...)
- **Cumulative scoring**: Builds risk profile over time

### Privacy
- IP addresses are hashed by default
- Raw IPs never logged unless `log_raw_ip: true`
- GDPR-friendly out of the box

## Dashboard

Visit `/agentgate-dashboard` to see:
- Total requests and suspected agents
- Score distribution (low/medium/high/critical)
- Actions taken
- Top user agents and paths
- Honeypot hits
- Recent events

### Authentication

**Development**:
```bash
# Access with query param
/agentgate-dashboard?token=your-token
```

**Production**:
```bash
# Set environment variable
export AGENTGATE_DASHBOARD_TOKEN=your-secure-token

# Access with Bearer header
curl -H "Authorization: Bearer your-token" \
  https://yoursite.com/agentgate-dashboard
```

If `AGENTGATE_DASHBOARD_TOKEN` is not set, dashboard returns 503 in production.

## Webhooks

Real-time notifications for critical events:

```yaml
webhooks:
  enabled: true
  targets:
    - name: "slack-security"
      url: "https://hooks.slack.com/..."
      events:
        - "honeypot_hit"
        - "critical_score"
        - "blocked"
      secret: "your-webhook-secret"  # For HMAC-SHA256 signing
      timeout_ms: 3000
```

### Events
- `honeypot_hit`: Bot visited honeypot URL
- `critical_score`: Score >= 90
- `blocked`: Request blocked
- `rate_limit_exceeded`: Rate limit triggered
- `session_violation`: Session pattern detected

### Security
Webhooks are signed with HMAC-SHA256 using Web Crypto API (Edge-compatible).

## Framework Adapters

### Next.js
```typescript
import { createAgentGate, loadPolicy } from 'agentgate-firewall'

const agentGate = createAgentGate({ policy: loadPolicy('./agent-policy.yaml') })

export async function middleware(request: NextRequest) {
  const result = await agentGate.processRequest(normalizeNextRequest(request))
  return handleNextMiddleware(request, result)
}
```

### Express
```typescript
import { createAgentGate, createExpressMiddleware } from 'agentgate-firewall'

const agentGate = createAgentGate({ policy })

app.use(createExpressMiddleware(async (req) => {
  return await agentGate.processRequest(normalizeExpressRequest(req))
}))
```

### Cloudflare Workers
```typescript
import { handleCloudflareRequest, createAgentGateForCloudflare } from 'agentgate-firewall'

export default {
  async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
    const agentGate = await createAgentGateForCloudflare(env)
    return handleCloudflareRequest(request, env, ctx, agentGate)
  }
}
```

## Logger

AgentGate supports multiple loggers:

```typescript
// JSONL (production)
import { createJsonlLogger } from 'agentgate-firewall'
const logger = createJsonlLogger({ filePath: './logs.jsonl' })

// Console (development)
import { createConsoleLogger } from 'agentgate-firewall'
const logger = createConsoleLogger({ colors: true, verbose: true })
```

Log entry format:
```json
{
  "timestamp": "2026-05-25T10:00:00Z",
  "ip": "a1b2c3d4...",  // Hashed by default
  "ipRaw": "192.168.1.1",  // Only if log_raw_ip: true
  "path": "/pricing",
  "userAgent": "GPTBot/1.0",
  "score": 72,
  "action": "sandbox",
  "signals": ["known_ai_user_agent", "high_request_rate"]
}
```

---

## Security Considerations

### Trusted Proxies

When behind a reverse proxy (Cloudflare, AWS ALB, Nginx, etc.), never trust `X-Forwarded-For` headers without configuring trusted proxies:

```typescript
import { extractClientIP } from 'agentgate-firewall'

// ❌ Insecure — trusts any incoming header
const ip = extractClientIP(request.headers)

// ✅ Secure — only trusts headers from known proxies
const ip = extractClientIP(request.headers, ['203.0.113.1', '198.51.100.1'])
```

**Recommended**: Use `socket.remoteAddress` directly when not behind a proxy.

### Webhook SSRF Prevention

Webhooks enforce:
- **HTTPS only** — HTTP targets are rejected
- **Private IP blocking** — 10.x, 172.16-31.x, 192.168.x, localhost blocked
- **DNS resolution validation** — hostnames resolving to private IPs are rejected
- **Configurable timeout** — default 5s, max via `timeout_ms`
- **TLS verification** — `rejectUnauthorized: true` by default

### Session Security

- IPs are **SHA-256 hashed** before storage (privacy by default)
- Session IDs are **cryptographically random** (`crypto.randomUUID()`)
- Sessions expire after configurable TTL (default 30 min)
- Cookie attributes: `SameSite=Lax`, configurable `Secure` flag

### Content Security Policy

AgentGate automatically injects security headers in responses:

| Action | Headers |
|--------|---------|
| **block** | `Content-Security-Policy: default-src 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` |
| **challenge/sandbox** | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` |

### Privacy

- **IP hashing**: Enabled by default (`hash_ip: true`). Uses HMAC-SHA256 with a random salt per process.
- **Raw IP logging**: Disabled by default (`log_raw_ip: false`). Only enable if required for compliance.
- **No PII**: AgentGate does not log cookies, authorization headers, or request bodies.
- **GDPR-friendly**: Out-of-the-box configuration is compliant with data minimization principles.

### Configuration Security

- **YAML/JSON policies**: Both formats are supported. For production, use JSON with `loadPolicyFromJson()` for reduced attack surface. Both run through `stripProto()` to prevent prototype pollution.
- **Environment variables**: Sensitive configuration (Redis tokens, webhook secrets, dashboard tokens) should use environment variables, not inline in policy files.
- **Log file path**: Relative paths with `..` are rejected to prevent path traversal.

### Production Security Checklist

- [ ] Configure **trusted proxies** in `extractClientIP()`
- [ ] Use **Redis** rate limiting (`store: redis`)
- [ ] Set `AGENTGATE_DASHBOARD_TOKEN` environment variable
- [ ] Enable **webhooks** with HTTPS targets and HMAC secrets
- [ ] Set `cookie_secure: true` (requires HTTPS)
- [ ] Disable `expose_debug_headers` (set to `false`)
- [ ] Use `failure_mode: challenge` (not `open`)
- [ ] Use `loadPolicyFromJson()` for reduced attack surface
- [ ] Start **`log_only` mode** for 1-2 weeks before enforcing
- [ ] Review audit logs for `[AgentGate Audit]` warnings (block/sandbox/challenge events)

## Philosophy

> AgentGate does not try to perfectly identify every AI agent. It creates a policy-driven perimeter where suspicious automated behavior can be scored, limited, sandboxed, blocked, or logged.

- **No perfect detection**: We use composable signals, not fingerprints
- **Policy-driven**: Site owners declare what missions they accept
- **Graduated response**: Not all bots are equal; responses scale with risk
- **Observability**: Everything is logged for analysis
- **Human-friendly**: Real users are never affected

## Production Deployment

### Environment Variables

```bash
# Redis (optional, for production rate limiting)
AGENTGATE_REDIS_URL=your-redis-url
AGENTGATE_REDIS_TOKEN=your-redis-token

# Dashboard authentication
AGENTGATE_DASHBOARD_TOKEN=your-secure-token

# Webhooks (optional)
AGENTGATE_WEBHOOK_URL=https://your-webhook-endpoint.com
AGENTGATE_WEBHOOK_SECRET=your-signing-secret
```

### Recommendations

1. **Start in `log_only` mode** for 1-2 weeks
2. **Review dashboard** to understand traffic patterns
3. **Enable Redis** for production rate limiting
4. **Set `cookie_secure: true`** in production
5. **Disable debug headers** in production
6. **Configure webhooks** for security alerts
7. **Use `failure_mode: challenge`** in production

## Roadmap

### Phase 2 (Current) ✅
- [x] Real rate limiting (sliding window)
- [x] Session tracking
- [x] Dashboard authentication
- [x] Cloudflare Workers adapter
- [x] Webhook notifications
- [x] Privacy-first logging

### Phase 3 (Future)
- [ ] IP reputation provider interface
- [ ] Qwen mission classifier
- [ ] Canary tokens
- [ ] CLI tool
- [ ] SQLite logger adapter

### Not Planned (Yet)
- SaaS dashboard
- Billing/monetization
- ML anomaly detection
- Browser fingerprinting

---

## Ecosystem

AgentGate is part of the **Carlos-Projects** security infrastructure for AI agents:

```
Palisade Scanner    →  Scan content before agents consume it.
MCPwn               →  Attack MCP servers before attackers do.
AgentGate           →  Control how agents access your website.  ← you are here
MCPscop             →  Centralize scanner results and security posture.
MCPGuard            →  Runtime security proxy for MCP/A2A protocols.
```

- [Palisade Scanner](https://github.com/Carlos-Projects/palisade-scanner) — Scan web content for prompt injection and adversarial content
- [MCPwn](https://github.com/Carlos-Projects/mcpwn) — Offensive security testing framework for MCP servers
- [MCPscop](https://github.com/Carlos-Projects/mcpscope) — Unified security dashboard for MCP/A2A scanner results
- [MCPGuard](https://github.com/Carlos-Projects/mcpguard) — Runtime security proxy for MCP/A2A protocols

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## Security

Found a vulnerability? See [SECURITY.md](SECURITY.md).

## License

MIT — see [LICENSE](LICENSE)
