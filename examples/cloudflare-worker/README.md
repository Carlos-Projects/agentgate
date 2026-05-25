# AgentGate Cloudflare Worker Example

This example demonstrates how to deploy AgentGate as a Cloudflare Worker.

## Features

- ✅ Full AgentGate protection at the edge
- ✅ Sliding window rate limiting (memory or Redis)
- ✅ Session tracking with cookies
- ✅ Dashboard with authentication
- ✅ Webhook notifications
- ✅ Privacy-first (IP hashing)
- ✅ Zero cold starts (Workers are always-on)

## Quick Start

### 1. Install Dependencies

```bash
# Install AgentGate
npm install agentgate

# Install Redis adapter (optional, for production rate limiting)
npm install @upstash/redis

# Install Wrangler CLI
npm install -g wrangler
```

### 2. Configure Wrangler

Copy the example files to your project:

```bash
cp -r node_modules/agentgate/examples/cloudflare-worker/* ./
```

Edit `wrangler.toml` to customize your policy.

### 3. Set Secrets

```bash
wrangler login

# Required for dashboard auth
wrangler secret put AGENTGATE_DASHBOARD_TOKEN
# Enter a secure random token (e.g., openssl rand -hex 32)

# Optional: Redis for production rate limiting
wrangler secret put AGENTGATE_REDIS_URL
# Enter your Upstash Redis URL

wrangler secret put AGENTGATE_REDIS_TOKEN
# Enter your Upstash Redis token
```

### 4. Deploy

```bash
wrangler deploy
```

### 5. Test

```bash
# Test normal request
curl https://your-worker.your-subdomain.workers.dev

# Test dashboard (with auth)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-worker.your-subdomain.workers.dev/agentgate-dashboard

# Test honeypot (should be blocked)
curl https://your-worker.your-subdomain.workers.dev/agent-honeypot
```

## Configuration

### Policy Settings

Edit the `AGENTGATE_POLICY` variable in `wrangler.toml`:

```yaml
mode: log_only  # Start with log_only, switch to enforce later

rate_limit:
  enabled: true
  store: memory  # Use "redis" for production
  failure_mode: open  # open | challenge | block

session:
  enabled: true
  ttl_ms: 1800000  # 30 minutes
```

### Redis Setup (Production)

For production rate limiting, use Upstash Redis:

1. Create account at https://upstash.com
2. Create Redis database
3. Get URL and token
4. Set secrets:
   ```bash
   wrangler secret put AGENTGATE_REDIS_URL
   wrangler secret put AGENTGATE_REDIS_TOKEN
   ```
5. Update policy:
   ```yaml
   rate_limit:
     store: redis
   ```

### Dashboard Access

**Development**:
```
https://your-worker.workers.dev/agentgate-dashboard?token=YOUR_TOKEN
```

**Production** (header only):
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-worker.workers.dev/agentgate-dashboard
```

## Cost Estimation

**Free tier** (suitable for testing):
- 100,000 requests/day
- Memory store only
- No Redis costs

**Production** (example):
- 1M requests/day: ~$5 (Workers)
- Upstash Redis: ~$3/month (free tier available)
- **Total**: ~$8/month

## Advanced Usage

### Custom Policy Loading

Instead of inline YAML, load from a file:

```typescript
import { loadPolicy } from 'agentgate'

const policy = await fetch('https://your-cdn.com/policy.yaml')
  .then(r => r.text())
  .then(yaml => loadPolicyFromString(yaml))
```

### Webhook Integration

Add to policy:

```yaml
webhooks:
  enabled: true
  targets:
    - name: "slack"
      url: "https://hooks.slack.com/..."
      events:
        - "honeypot_hit"
        - "blocked"
```

### Custom Routes

Skip AgentGate for specific routes:

```typescript
const url = new URL(request.url)

if (url.pathname.startsWith('/api/public')) {
  return fetch(request)  // Skip AgentGate
}

return handleCloudflareRequest(request, env, ctx, agentGate)
```

## Troubleshooting

### "Redis store requires '@upstash/redis'"

Install the optional dependency:
```bash
npm install @upstash/redis
```

### Dashboard returns 401

Ensure you're using Bearer header in production:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" ...
```

### Rate limiting not working

Check:
1. `rate_limit.enabled: true` in policy
2. Memory store is for dev only (use Redis for production)
3. Check failure_mode setting

## Limitations

- ❌ No JSONL logging (Workers don't have filesystem)
- ❌ No KV logging (not implemented yet)
- ✅ Console logging available
- ✅ Webhooks work with waitUntil

## Next Steps

1. Monitor dashboard for traffic patterns
2. Adjust rate limits based on usage
3. Switch to `mode: enforce` when ready
4. Set up webhooks for security alerts
5. Consider upgrading to Redis for production

## Resources

- [AgentGate Documentation](../../README.md)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Upstash Redis Docs](https://upstash.com/docs/redis)
