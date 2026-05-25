# AgentGate Architecture

## Overview

AgentGate is designed as a modular, runtime-agnostic core with framework-specific adapters.

```
┌─────────────────────────────────────────────────────────────┐
│                     Framework Adapters                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Next.js   │  │  Express    │  │  Cloudflare Worker  │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      AgentGate Core                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │  Detect  │─▶│  Score   │─▶│  Decide  │─▶│   Action   │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
│       │              │              │              │        │
│       ▼              ▼              ▼              ▼        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Policy Engine + Validation               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Stateful Services                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │Rate Limiter │  │   Session   │  │     Webhooks        │ │
│  │  (Sliding   │  │   Manager   │  │  (Fire-and-forget)  │ │
│  │   Window)   │  │             │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Storage Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Memory    │  │    Redis    │  │      JSONL          │ │
│  │  (Dev/Demo) │  │ (Production)│  │   (Audit Trail)     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Core Modules

### 1. Detector (`src/core/detect.ts`)

Extracts signals from incoming requests:

- User-Agent analysis (known AI agents, suspicious patterns)
- Header validation (Accept-Language, cookies)
- Rate limiting signals
- Honeypot path detection
- JavaScript execution flags

### 2. Scorer (`src/core/score.ts`)

Calculates risk score from detected signals:

- Configurable weights per signal type
- Threshold-based action determination
- Score capping at 100

### 3. Policy Engine (`src/core/policy.ts`)

Loads and applies policy rules:

- YAML configuration parsing
- Path-based rules
- Agent-based rules
- Scoring configuration overrides
- **Validation at initialization**

### 4. Decision Engine (`src/core/decide.ts`)

Determines final action:

- Combines score-based and policy-based decisions
- Priority: agent > path > score
- Respects mode (log_only vs enforce)
- Generates response headers

### 5. Normalizer (`src/core/normalize.ts`)

Converts framework requests to AgentGate format:

- IP extraction from headers
- **IP hashing for privacy**
- Cookie parsing
- Header normalization

## Stateful Services (NEW in v0.2)

### Rate Limiter (`src/rate-limit/`)

**Sliding window implementation** with multi-key checking:

```typescript
interface RateLimiter {
  check(
    ipHash: string,
    path: string,
    sessionId?: string,
    userAgent?: string,
    signals: SignalType[]
  ): Promise<RateLimitResult>
  
  record(
    ipHash: string,
    path: string,
    sessionId?: string,
    userAgent?: string
  ): Promise<void>
}
```

**Multi-key strategy**:
- `ip:{hash}` - Global IP limit
- `ip_path:{ip}:{path}` - Per-path limit
- `session:{id}` - Session-based limit
- `ua:{hash}` - User-Agent limit

**Storage backends**:
- MemoryRateLimitStore (development)
- RedisRateLimitStore (production, via Upstash)

### Session Manager (`src/session/`)

Behavioral tracking with fingerprint fallback:

```typescript
interface SessionManager {
  getOrCreateSession(
    ip: string,
    userAgent: string,
    acceptLanguage?: string,
    existingCookie?: string
  ): Promise<SessionResult>
  
  updateSession(
    sessionId: string,
    input: SessionUpdateInput
  ): Promise<void>
  
  detectRepeatedPattern(session: AgentSession): Promise<boolean>
}
```

**Features**:
- Cookie-based sessions (30 min TTL)
- Fingerprint fallback (10 min TTL)
- Path pattern normalization
- Cumulative scoring
- Honeypot hit tracking

### Webhook Sender (`src/webhooks/`)

Fire-and-forget notifications:

```typescript
interface WebhookSender {
  send(
    event: WebhookEvent,
    data: WebhookPayload['data'],
    runtime?: { waitUntil?: (promise: Promise<unknown>) => void }
  ): Promise<void>
}
```

**Events**:
- honeypot_hit
- critical_score
- blocked
- rate_limit_exceeded
- session_violation

**Security**: HMAC-SHA256 signing via Web Crypto API

## Adapters

### Next.js Adapter (`src/adapters/nextjs.ts`)

- `normalizeNextRequest`: Converts NextRequest to AdapterRequest
- `createNextResponse`: Generates NextResponse from DecisionResult
- `handleNextMiddleware`: Complete middleware handler

### Express Adapter (`src/adapters/express.ts`)

- `normalizeExpressRequest`: Converts Express Request
- `createExpressMiddleware`: Creates Express middleware function

### Cloudflare Workers Adapter (`src/adapters/cloudflare.ts`) NEW

- `normalizeCloudflareRequest`: Converts Request with CF-specific IP handling
- `handleCloudflareRequest`: **Fetch passthrough** (preserves origin response)
- `createBlockResponse`: 403 with JSON body
- `createRedirectResponse`: 302 with proper headers
- Integration with `ctx.waitUntil()` for background tasks

## Storage Layer

### Memory Stores (`src/store/memory/`)

**RateLimitStore**:
- Sliding window with timestamp arrays
- MAX_ENTRIES_PER_KEY limit (1000)
- Automatic cleanup every 30s
- `unref()` for graceful process exit

**SessionStore**:
- TTL-based expiry
- Automatic cleanup
- Fingerprint support

⚠️ **Warning**: Memory stores are for development/demo only. Not suitable for production high-traffic.

### Redis Stores (`src/store/redis/`) NEW

**RateLimitStore**:
- Sorted sets for sliding window
- ZADD, ZREMRANGEBYSCORE, ZCARD operations
- Configurable key prefix
- Dynamic import (optional dependency)

**SessionStore**:
- String storage with JSON serialization
- PEXPIRE for TTL
- Configurable key prefix

**Installation**:
```bash
npm install @upstash/redis
```

### JSONL Logger (`src/logger/jsonl.ts`)

- Append-only file format
- Log rotation support
- Queryable with standard tools
- Privacy-first (hashed IPs by default)

## Data Flow (v0.2)

```
Request
   │
   ▼
┌─────────────────┐
│ Adapter         │ Normalize + IP hashing
│ (Next/Express/  │
│  Cloudflare)    │
└─────────────────┘
   │
   ▼
┌─────────────────┐
│ Session Manager │ Get/create session
│                 │ Set cookie if new
└─────────────────┘
   │
   ▼
┌─────────────────┐
│ Detector        │ Extract signals
└─────────────────┘
   │
   ▼
┌─────────────────┐
│ Rate Limiter    │ Record + Check (STRICT MODE)
│                 │ If limited → return early
└─────────────────┘
   │
   ▼
┌─────────────────┐
│ Scorer          │ Calculate risk score
└─────────────────┘
   │
   ▼
┌─────────────────┐
│ Policy Engine   │ Load rules, match paths/agents
└─────────────────┘
   │
   ▼
┌─────────────────┐
│ Decision Engine │ Determine action
└─────────────────┘
   │
   ▼
┌─────────────────┐
│ Session Update  │ Update with score, action, paths
└─────────────────┘
   │
   ▼
┌─────────────────┐
│ Logger          │ Record entry (hashed IP)
└─────────────────┘
   │
   ▼
┌─────────────────┐
│ Webhooks        │ Fire-and-forget for critical events
└─────────────────┘
   │
   ▼
Response (allow/block/redirect + headers)
```

## Privacy & Compliance

### IP Handling

```typescript
RequestContext {
  ip: string      // Hashed by default
  ipHash: string  // For logging/sessions
  ipRaw?: string  // Only if log_raw_ip: true
}
```

**Default behavior**:
- Hash all IPs with SHA-256
- Never log raw IPs
- Use hash for rate limiting keys

**Configuration**:
```yaml
privacy:
  hash_ip: true       # Default
  log_raw_ip: false   # Default
```

### Session Privacy

- Fingerprint fallback uses hash(IP + UA + Accept-Language)
- Shorter TTL for fingerprints (10 min vs 30 min)
- No raw IP storage in sessions

## Configuration Loading

1. Load YAML from file or string
2. Merge with DEFAULT_POLICY
3. Override scoring weights/thresholds
4. **Validate policy** (fail fast)
5. Initialize stores based on config

## Thread Safety

AgentGate core is stateless and thread-safe. Each request is processed independently.

Stateful components (rate limiting, session tracking) use:
- Atomic operations in Redis
- Thread-safe Maps in memory stores
- Proper cleanup intervals

## Performance

- No LLM calls in request path
- YAML parsed once at initialization
- Signals extracted in O(1) for most cases
- Score calculation is O(n) where n = number of signals (typically < 15)
- Rate limit check: O(k) where k = number of keys (typically 3-4)
- **Total overhead**: < 10ms per request (memory store), < 20ms (Redis)

## Runtime Compatibility

| Feature | Node.js | Next.js | Cloudflare Workers |
|---------|---------|---------|-------------------|
| Core | ✅ | ✅ | ✅ |
| Memory stores | ✅ | ✅ | ✅ |
| Redis stores | ✅ | ✅ | ✅ |
| JSONL logger | ✅ | ✅ | ❌ (no fs) |
| Console logger | ✅ | ✅ | ✅ |
| Web Crypto | ✅ | ✅ | ✅ |
| Webhooks | ✅ | ✅ | ✅ (with waitUntil) |

## Error Handling

### Policy Validation Errors

```typescript
// At initialization
const validation = validatePolicy(policy)
if (!validation.valid) {
  throw new Error(`Invalid policy: ${validation.errors.join(', ')}`)
}
```

### Rate Limit Store Failures

```typescript
// Graceful degradation based on failure_mode
try {
  await rateLimiter.check(...)
} catch (error) {
  const mode = config.failure_mode ?? 'open'
  if (mode === 'open') {
    // Allow but log warning
  } else if (mode === 'challenge') {
    // Require challenge
  } else {
    // Block
  }
}
```

### Redis Dependency

```typescript
// Dynamic import with clear error
const mod = await import('@upstash/redis').catch(() => null)
if (!mod) {
  throw new Error("Redis store requires '@upstash/redis'")
}
```

## Extensibility

### Custom Stores

Implement the interface:

```typescript
interface RateLimitStore {
  check(keys: string[], windowMs: number, maxRequests: number): Promise<RateLimitCheckResult>
  record(keys: string[], windowMs: number): Promise<void>
  reset(key: string): Promise<void>
}
```

### Custom Loggers

```typescript
interface Logger {
  log(entry: LogEntry): Promise<void>
  getLogs?(limit?: number): Promise<LogEntry[]>
}
```

### Webhook Events

Add new event types to `WebhookEvent` type in `src/webhooks/types.ts`.
