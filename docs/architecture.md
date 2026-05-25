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
│  │                  Policy Engine                        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Side Effects                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Logger    │  │  Honeypot   │  │     Dashboard       │ │
│  │  (JSONL)    │  │  Generator  │  │    (Analytics)      │ │
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

### 4. Decision Engine (`src/core/decide.ts`)

Determines final action:

- Combines score-based and policy-based decisions
- Priority: path > agent > score
- Respects mode (log_only vs enforce)
- Generates response headers

### 5. Normalizer (`src/core/normalize.ts`)

Converts framework requests to AgentGate format:

- IP extraction from headers
- Cookie parsing
- Header normalization

## Adapters

### Next.js Adapter (`src/adapters/nextjs.ts`)

- `normalizeNextRequest`: Converts NextRequest to AdapterRequest
- `createNextResponse`: Generates NextResponse from DecisionResult
- `handleNextMiddleware`: Complete middleware handler

### Express Adapter (`src/adapters/express.ts`)

- `normalizeExpressRequest`: Converts Express Request
- `createExpressMiddleware`: Creates Express middleware function

## Loggers

### JSONL Logger (`src/logger/jsonl.ts`)

- Appends JSON entries to file
- Supports log rotation
- Queryable with standard tools

### Console Logger (`src/logger/console.ts`)

- Color-coded output
- Verbose mode for debugging
- Development-focused

## Honeypot Generators

### Static (`src/honeypot/static.ts`)

- Predefined honeypot paths
- Simple validation
- No cryptographic overhead

### Dynamic (`src/honeypot/dynamic.ts`)

- HMAC-signed tokens
- Time-limited validity
- Prevents replay attacks

## Data Flow

```
Request
   │
   ▼
┌─────────────────┐
│ Adapter         │ Normalize to AgentGate format
│ (Next/Express)  │
└─────────────────┘
   │
   ▼
┌─────────────────┐
│ Detector        │ Extract signals
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
│ Logger          │ Record entry
└─────────────────┘
   │
   ▼
Response (allow/block/redirect)
```

## Configuration Loading

1. Load YAML from file or string
2. Merge with DEFAULT_POLICY
3. Override scoring weights/thresholds
4. Validate required fields

## Thread Safety

AgentGate core is stateless and thread-safe. Each request is processed independently. Stateful components (rate limiting, session tracking) are designed as external adapters.

## Performance

- No LLM calls in request path
- YAML parsed once at startup
- Signals extracted in O(1) for most cases
- Score calculation is O(n) where n = number of signals (typically < 15)
- Total overhead: < 5ms per request
