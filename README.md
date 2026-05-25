# AgentGate

**Policy-based firewall and honeypot middleware for AI agents accessing websites**

AgentGate provides a programmable perimeter for controlling how AI agents, crawlers, and automated systems access your web content. It detects automated traffic, scores risk, enforces policies, and provides observability—all without expensive infrastructure.

## Features

- **Multi-signal detection**: Combines user-agent, headers, behavior, and rate limiting
- **Policy-driven control**: YAML-based configuration for approved/denied missions
- **Risk scoring**: 0-100 score based on configurable signal weights
- **Graduated responses**: allow, limited, challenge, sandbox, block
- **Honeypot system**: Static and dynamic trap URLs for bot detection
- **JSONL logging**: Portable, queryable audit trail
- **Dashboard**: Built-in analytics for agent traffic
- **Framework adapters**: Next.js, Express, Cloudflare Workers (coming)

## Quick Start

### Installation

```bash
npm install agentgate
```

### Basic Setup (Next.js)

1. Create `agent-policy.yaml` in your project root:

```yaml
mode: log_only
defaults:
  action: allow
  expose_debug_headers: true
known_ai_agents:
  - GPTBot
  - ClaudeBot
  - PerplexityBot
honeypots:
  - /agent-honeypot
  - /bot-trap
```

2. Add middleware:

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
    ip: request.ip,
    path: request.nextUrl.pathname,
    method: request.method,
    userAgent: request.headers.get('user-agent') || '',
    cookies: Object.fromEntries(request.cookies),
    headers: Object.fromEntries(request.headers),
  });

  if (result.action === 'block') {
    return new NextResponse('Blocked', { status: 403 });
  }

  if (result.redirectPath) {
    return NextResponse.redirect(result.redirectPath);
  }

  return NextResponse.next();
}
```

3. Run your Next.js app and visit `/agentgate-dashboard` to see analytics.

## Policy Configuration

See [config/agent-policy.example.yaml](config/agent-policy.example.yaml) for full options.

```yaml
mode: log_only  # or 'enforce'

approved_agents:
  - name: Googlebot
    action: allow
  - name: Bingbot
    action: allow

paths:
  /admin/*:
    action: block
  /api/*:
    action: challenge
  /pricing/*:
    action: limited

scoring:
  weights:
    known_ai_user_agent: 25
    honeypot_hit: 50
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

## Scoring Signals

| Signal | Default Weight |
|--------|---------------|
| known_ai_user_agent | 25 |
| honeypot_hit | 50 |
| robots_violation | 30 |
| policy_mismatch | 35 |
| high_request_rate | 20 |
| suspicious_user_agent | 15 |
| datacenter_asn | 15 |
| repeated_path_pattern | 15 |
| missing_accept_language | 10 |
| no_js_execution | 10 |
| missing_cookies | 8 |

## Dashboard

Visit `/agentgate-dashboard` to see:

- Total requests and suspected agents
- Score distribution
- Actions taken
- Top user agents and paths
- Honeypot hits
- Recent events

## Logger

AgentGate supports multiple loggers:

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
  "signals": ["known_ai_user_agent", "high_request_rate"]
}
```

## Honeypots

### Static Honeypots

```typescript
import { createStaticHoneypotGenerator } from 'agentgate';
const generator = createStaticHoneypotGenerator(policy);
const url = generator.generateUrl(); // /agent-honeypot
```

### Dynamic Honeypots (token-based)

```typescript
import { createDynamicHoneypotGenerator } from 'agentgate';
const generator = createDynamicHoneypotGenerator({
  secret: 'your-secret-key',
  expiryMs: 3600000,
});
const url = generator.generateUrl(); // /.well-known/agent-trap/:token
```

## Philosophy

> AgentGate does not try to perfectly identify every AI agent. It creates a policy-driven perimeter where suspicious automated behavior can be scored, limited, sandboxed, blocked, or logged.

- **No perfect detection**: We use composable signals, not fingerprints
- **Policy-driven**: Site owners declare what missions they accept
- **Graduated response**: Not all bots are equal; responses scale with risk
- **Observability**: Everything is logged for analysis
- **Human-friendly**: Real users are never affected

## Roadmap

- [ ] Cloudflare Workers adapter
- [ ] SQLite logger adapter
- [ ] Qwen-based mission classifier
- [ ] Rate limiting with Redis
- [ ] Dashboard authentication
- [ ] API monetization layer
- [ ] Browser fingerprinting (optional)

## License

MIT
