# AgentGate Policy Format

## Overview

AgentGate policies are defined in YAML format. This document describes all available options.

## Basic Structure

```yaml
mode: log_only
defaults:
  action: allow
  expose_debug_headers: true
approved_agents: [...]
known_ai_agents: [...]
paths: {...}
scoring: {...}
honeypots: [...]
```

## Fields

### `mode` (required)

Operating mode for the firewall.

**Values:**
- `log_only`: Log all decisions but don't block (recommended for initial deployment)
- `enforce`: Apply all actions including blocks and redirects

**Example:**
```yaml
mode: log_only
```

### `defaults` (required)

Default behavior when no specific rules match.

**Fields:**
- `action`: Default action to take
- `expose_debug_headers`: Whether to add X-AgentGate-* headers

**Example:**
```yaml
defaults:
  action: allow
  expose_debug_headers: true
```

### `approved_agents` (optional)

List of explicitly approved agents with their allowed actions.

**Fields per agent:**
- `name`: User-Agent substring to match
- `action`: Action to take (allow, limited, challenge, etc.)
- `paths`: Optional path restrictions

**Example:**
```yaml
approved_agents:
  - name: Googlebot
    action: allow
    paths:
      - "/*"
  - name: Bingbot
    action: allow
    paths:
      - "/*"
  - name: MyPartnerBot
    action: limited
    paths:
      - "/public/*"
      - "/docs/*"
```

### `known_ai_agents` (optional)

List of known AI agent User-Agent substrings. These trigger scoring but aren't automatically blocked.

**Default:**
```yaml
known_ai_agents:
  - GPTBot
  - ClaudeBot
  - PerplexityBot
  - CCBot
  - Applebot-Extended
  - Google-Extended
  - anthropic-ai
  - cohere-ai
```

### `paths` (optional)

Path-specific rules with glob-like matching.

**Supported patterns:**
- Exact match: `/admin`
- Prefix match: `/admin/*` (matches /admin, /admin/users, /admin/settings, etc.)

**Fields per path:**
- `action`: Action to take
- `max_requests_per_minute`: Optional rate limit

**Example:**
```yaml
paths:
  /admin/*:
    action: block
  /api/*:
    action: challenge
    max_requests_per_minute: 30
  /pricing/*:
    action: limited
  /docs/*:
    action: allow
  /blog/*:
    action: allow
```

### `scoring` (optional)

Override default scoring weights and thresholds.

**Fields:**
- `weights`: Score contribution per signal type
- `thresholds`: Score ranges for each action

**Default weights:**
```yaml
scoring:
  weights:
    known_ai_user_agent: 25
    suspicious_user_agent: 15
    missing_accept_language: 10
    missing_cookies: 8
    high_request_rate: 20
    honeypot_hit: 50
    robots_violation: 30
    no_js_execution: 10
    datacenter_asn: 15
    repeated_path_pattern: 15
    policy_mismatch: 35
```

**Default thresholds:**
```yaml
  thresholds:
    allow: 0      # 0-29
    limited: 30   # 30-54
    challenge: 55 # 55-69
    sandbox: 70   # 70-89
    block: 90     # 90-100
```

**Note:** Score ranges are:
- `allow`: score < limited threshold
- `limited`: limited threshold ≤ score < challenge threshold
- `challenge`: challenge threshold ≤ score < sandbox threshold
- `sandbox`: sandbox threshold ≤ score < block threshold
- `block`: score ≥ block threshold

### `honeypots` (optional)

List of honeypot paths that trigger high-score detection.

**Default:**
```yaml
honeypots:
  - /agent-honeypot
  - /bot-trap
  - /internal-agent-policy
  - /scrape-check
```

**Recommendation:** Add additional paths that would never be visited by humans:
```yaml
honeypots:
  - /admin-login
  - /wp-admin
  - /.env
  - /backup.sql
  - /config.php
  - /sitemap.xml.bak
```

## Complete Example

```yaml
# Production policy for e-commerce site
mode: enforce

defaults:
  action: limited
  expose_debug_headers: false

approved_agents:
  - name: Googlebot
    action: allow
  - name: Bingbot
    action: allow
  - name: PriceAPI
    action: allow
    paths:
      - "/api/products/*"

known_ai_agents:
  - GPTBot
  - ClaudeBot
  - PerplexityBot
  - CCBot
  - Applebot-Extended
  - Google-Extended

paths:
  /admin/*:
    action: block
  /api/*:
    action: challenge
    max_requests_per_minute: 30
  /pricing/*:
    action: challenge
  /checkout/*:
    action: block
  /cart/*:
    action: limited
  /products/*:
    action: limited
  /blog/*:
    action: allow
  /docs/*:
    action: allow

scoring:
  weights:
    known_ai_user_agent: 30
    honeypot_hit: 60
    high_request_rate: 25
    suspicious_user_agent: 20
  thresholds:
    allow: 0
    limited: 25
    challenge: 50
    sandbox: 70
    block: 85

honeypots:
  - /agent-honeypot
  - /bot-trap
  - /.env
  - /wp-admin
  - /backup
  - /config.bak
```

## Actions Reference

| Action | Behavior |
|--------|----------|
| `allow` | Request proceeds normally |
| `limited` | Request proceeds with X-AgentGate-Limited header |
| `challenge` | Redirect to /agent-access for mission declaration |
| `sandbox` | Redirect to /agent-sandbox controlled environment |
| `block` | Return 403 Forbidden |
| `log_only` | Log request but don't interfere (overrides other actions in log_only mode) |

## Best Practices

1. **Start with `mode: log_only`** for 1-2 weeks
2. **Review dashboard** to understand traffic patterns
3. **Approve search engines** explicitly
4. **Set conservative thresholds** initially
5. **Use path rules** for sensitive areas
6. **Add honeypots** relevant to your site
7. **Disable debug headers** in production
8. **Document policy** via /llms.txt

## Validation

Policy is validated on load. Invalid policies fall back to defaults with a warning.

## Dynamic Updates

Policy is loaded at startup. To update:
1. Edit agent-policy.yaml
2. Restart application

For dynamic updates without restart, use the programmatic API:

```typescript
agentGate.updatePolicy({
  mode: 'enforce',
  paths: {
    '/new-restricted/*': { action: 'block' }
  }
});
```
