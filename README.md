# AgentGate

**Policy-based firewall and honeypot middleware for AI agents accessing websites**

AgentGate provides a programmable perimeter for controlling how AI agents, crawlers, and automated systems interact with your web content. It detects automated traffic through behavioral fingerprinting, scores risk across 11 signals, enforces policies, and provides observability — without expensive infrastructure.

## Features

- **11 detection signals**: known AI agents, behavioral fingerprinting, JS challenges, timing analysis, honeypot traps, robots.txt violations, datacenter ASN detection, and more
- **Behavioral Fingerprinting Engine**: tracks request patterns, secondary resource loading (CSS/images), API-vs-HTML ordering, timing variance, and JS execution verification via client-side challenges
- **Policy-driven control**: YAML-based configuration for agent approval, path rules, rate limits, and scoring weights
- **Risk scoring**: 0-100 score configurable signal weights and graduated thresholds
- **Graduated responses**: `allow` → `limited` → `challenge` → `sandbox` → `block` + `log_only` mode
- **Honeypot system**: static and time-limited HMAC-signed URLs; standalone content server with fake admin panels, API docs, database dumps, and secrets files
- **Token Drain Engine**: serves large content (2MB+ pages), slow-streaming responses, deeply nested JSON, and recursive navigation chains to waste scrapers' LLM tokens
- **Agent Access Portal**: a `/agent-access` page where legitimate agents can declare their identity and mission
- **JSONL logging**: portable, queryable audit trail with automatic rotation
- **Dashboard**: built-in analytics showing request distribution, honeypot hits, score breakdown, and recent events
- **Framework adapters**: Next.js middleware, Express middleware (Cloudflare Workers adapter planned)
- **CLI**: standalone honeypot server via `agentgate-server`

## Quick Start

### Installation

```bash
npm install agentgate
```

### CLI — Standalone Honeypot Server

```bash
# Serve honeypot content on port 3000
npx agentgate-server

# Enable token drain (waste scraper resources)
npx agentgate-server --port 8080 --drain

# Visit:
#   Dashboard:    http://localhost:3000/agentgate-dashboard
#   Honeypot:     http://localhost:3000/admin
#   Secrets:      http://localhost:3000/.env
#   API:          http://localhost:3000/api/v2/users
#   Declaration:  http://localhost:3000/agent-access
```

### Next.js Middleware

```typescript
// middleware.ts
import { createAgentGate, loadPolicy, createJsonlLogger } from 'agentgate';

const policy = loadPolicy('./agent-policy.yaml');
const agentGate = createAgentGate({
  policy,
  logger: createJsonlLogger(),
});

export async function middleware(request: NextRequest) {
  const result = await agentGate.processRequest({
    ip: request.headers.get('x-forwarded-for') || 'unknown',
    path: request.nextUrl.pathname,
    method: request.method,
    userAgent: request.headers.get('user-agent') || '',
    cookies: Object.fromEntries(request.cookies.getAll().map(c => [c.name, c.value])),
    headers: Object.fromEntries(request.headers),
  });

  if (result.action === 'block') {
    return new NextResponse('Blocked by AgentGate', { status: 403 });
  }
  if (result.redirectPath) {
    return NextResponse.redirect(new URL(result.redirectPath, request.url));
  }
  return NextResponse.next();
}
```

### Express Middleware

```typescript
import { createAgentGate, loadPolicy, createConsoleLogger } from 'agentgate';
import { createExpressMiddleware } from 'agentgate';

const policy = loadPolicy('./agent-policy.yaml');
const agentGate = createAgentGate({ policy, logger: createConsoleLogger() });

app.use(createExpressMiddleware(
  async (req) => agentGate.processRequest({
    ip: req.ip || 'unknown',
    path: req.path,
    method: req.method,
    userAgent: req.headers['user-agent'] || '',
    cookies: req.cookies || {},
    headers: req.headers as Record<string, string>,
  })
));
```

### Programmatic Use

```typescript
import { AgentGate, DEFAULT_POLICY, SessionStore, calculateFingerprintScore } from 'agentgate';

const gate = new AgentGate({ policy: DEFAULT_POLICY });

// Basic detection
const result = await gate.processRequest({
  ip: '10.0.0.1',
  path: '/api/v2/users',
  method: 'GET',
  userAgent: 'GPTBot/1.0',
  cookies: {},
  headers: { 'user-agent': 'GPTBot/1.0' },
});

console.log(result.score, result.action, result.signals);
// → 93, 'block', ['known_ai_user_agent', 'direct_api_access', ...]

// Behavioral fingerprinting
const store = new SessionStore();
const session = store.getOrCreate('sess-1', '10.0.0.1', 'GPTBot/1.0');
recordRequest(session, '/api/v2/users', 'application/json');
recordRequest(session, '/api/v2/orders', 'application/json');

const fp = calculateFingerprintScore(session);
console.log(fp.score, fp.signals);
// → 60, ['direct_api_access', 'no_js_execution', 'no_secondary_resources']
```

## Policy Configuration

See [config/agent-policy.example.yaml](config/agent-policy.example.yaml) for full options.

```yaml
mode: enforce  # or 'log_only'

approved_agents:
  - name: Googlebot
    action: allow

paths:
  /admin/*:
    action: block
  /api/*:
    action: challenge
  /pricing:
    action: limited

scoring:
  weights:
    known_ai_user_agent: 25
    honeypot_hit: 50
    no_secondary_resources: 20
    direct_api_access: 25
    robotic_timing: 10
  thresholds:
    allow: 0
    limited: 30
    challenge: 55
    sandbox: 70
    block: 90
```

## Detection Signals

All 11 signals are functional:

| Signal | Default Weight | How it triggers |
|--------|---------------|-----------------|
| `known_ai_user_agent` | 25 | User-Agent matches known AI agent (GPTBot, ClaudeBot, etc.) |
| `suspicious_user_agent` | 15 | User-Agent matches suspicious patterns (bot, crawler, curl) |
| `missing_accept_language` | 10 | No Accept-Language header |
| `missing_cookies` | 8 | No cookies sent |
| `high_request_rate` | 20 | More than 60 requests/minute from same IP |
| `honeypot_hit` | 50 | Path matches a configured honeypot URL |
| `no_js_execution` | 10 | Client didn't run JS verification |
| `datacenter_asn` | 15 | User-Agent or Via header suggests datacenter origin |
| `repeated_path_pattern` | 15 | Sequential path crawling detected |
| `robots_violation` | 30 | Bot accesses disallowed paths |
| `policy_mismatch` | 35 | Request path doesn't match policy defaults |

### Behavioral Fingerprinting (additional)

The `SessionStore` + `calculateFingerprintScore()` provides real-time analysis:

- **No JS execution** (15pts): requests without running the JS challenge
- **No secondary resources** (20pts): only HTML/API requests, no CSS/images
- **Direct API access** (25pts): API called without prior HTML page visit
- **Robotic timing** (10pts): requests at perfectly uniform intervals
- **Honeypot chain** (15pts): multiple honeypot URLs visited in sequence
- **Challenge failed** (25pts): JS challenge was served but never completed

## Architecture

```
Request → normalizeRequest() → detectSignals() → calculateScore() → decide()
                                                                     ↓
                                                              AgentGate.processRequest()
                                                                     ↓
                                                            ┌──────────────────────┐
                                                            │   DecisionResult      │
                                                            │  action, score,       │
                                                            │  signals, headers,    │
                                                            │  redirectPath         │
                                                            └──────────────────────┘
                                                                    ↓
                                                    ┌───────────────┴───────────────┐
                                                    ↓                               ↓
                                            Logger.log()                  Framework Adapter
                                            (JSONL / Console)             (Next.js / Express)
```

## Honeypot Content Server

The standalone server (`agentgate-server`) serves realistic-looking traps:

| Path | Content |
|------|---------|
| `/admin` | Fake admin panel with users, sessions, config keys |
| `/secrets.env` | Fake environment variables (API keys, DB passwords) |
| `/.env` | Same fake secrets (common target path) |
| `/config/credentials.json` | Fake AWS/Stripe credentials |
| `/internal/docs/api-reference` | Fake API documentation with live endpoints |
| `/internal/ecosystem` | Fake internal wiki with service URLs |
| `/api/v2/users` | Fake JSON API returning user records |
| `/api/v2/internal/config` | Fake internal config endpoint |
| `/internal/documents/:page` | Up to 2MB generated content per page |
| `/internal/recursive` | Infinite recursive navigation chain |
| `/agent-access` | Agent declaration portal |
| `/agentgate-dashboard` | Live analytics dashboard |

## Token Drain Engine

When `--drain` is enabled, agents with score ≥ 70 (sandboxed) receive:

- **Massive pages**: content grows with each visit (up to 2MB)
- **Slow streaming**: 50KB chunks at 100ms intervals
- **Deeply nested JSON**: 20 levels of nested objects with array data
- **Recursive navigation**: pages that link to more pages indefinitely

Each drain response costs the scraping agent real LLM tokens (~500K tokens per 2MB page).

## Logger

```typescript
// JSONL (production)
import { createJsonlLogger } from 'agentgate';
const logger = createJsonlLogger({ filePath: './logs.jsonl' });

// Console (development)
import { createConsoleLogger } from 'agentgate';
const logger = createConsoleLogger({ colors: true, verbose: true });
```

Log entry format:
```json
{
  "timestamp": "2026-05-25T10:00:00Z",
  "ip": "192.168.1.1",
  "path": "/pricing",
  "userAgent": "GPTBot/1.0",
  "score": 72,
  "action": "sandbox",
  "signals": ["known_ai_user_agent", "high_request_rate"],
  "method": "GET",
  "responseTime": 45
}
```

## Dashboard

Visit `/agentgate-dashboard` on the standalone honeypot server to see:

- Total requests and suspected agents
- Score distribution
- Actions taken
- Top user agents and paths
- Honeypot hits
- Available honeypot endpoints

Note: the dashboard is served by the standalone server, not by the middleware adapter.

## SessionStore API

```typescript
import { SessionStore, recordRequest, calculateFingerprintScore } from 'agentgate';

const store = new SessionStore(); // auto-cleanup enabled
store.destroy(); // stop cleanup timer and clear sessions

const session = store.getOrCreate('session-id', 'ip', 'user-agent');
recordRequest(session, '/path', 'text/html');
const fp = calculateFingerprintScore(session);
```

## Philosophy

> AgentGate does not try to perfectly identify every AI agent. It creates a policy-driven perimeter where suspicious automated behavior can be scored, limited, sandboxed, blocked, or logged.

- **No perfect detection**: We use composable signals, not fingerprints
- **Policy-driven**: Site owners declare what missions they accept
- **Graduated response**: Not all bots are equal; responses scale with risk
- **Observability**: Everything is logged for analysis
- **Human-friendly**: Real users with JS-enabled browsers pass through

## Roadmap

- [x] Next.js adapter
- [x] Express adapter
- [x] Behavioral fingerprinting engine
- [x] JS challenge verification
- [x] Agent access portal
- [x] Standalone honeypot server
- [x] Token drain engine
- [x] Built-in rate limiting
- [x] All 11 detection signals implemented
- [ ] Cloudflare Workers adapter
- [ ] Redis-backed rate limiting
- [ ] Dashboard authentication

## Related Projects

- [palisade-scanner](https://github.com/Carlos-Projects/palisade-scanner) — Scan web content for prompt injection targeting AI agents
- [MCPGuard](https://github.com/Carlos-Projects/mcpguard) — Runtime security proxy for MCP

## License

MIT
