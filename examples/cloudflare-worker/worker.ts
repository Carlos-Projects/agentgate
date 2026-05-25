/**
 * Cloudflare Worker Example
 * 
 * This example demonstrates how to use AgentGate with Cloudflare Workers.
 * 
 * Setup:
 * 1. npm install @upstash/redis (optional, for Redis rate limiting)
 * 2. wrangler login
 * 3. wrangler secret put AGENTGATE_DASHBOARD_TOKEN
 * 4. wrangler secret put AGENTGATE_REDIS_URL (optional)
 * 5. wrangler secret put AGENTGATE_REDIS_TOKEN (optional)
 * 6. wrangler deploy
 */

import {
  handleCloudflareRequest,
  createAgentGateForCloudflare,
  CloudflareEnv,
} from '../../src/adapters/cloudflare'

export default {
  async fetch(
    request: Request,
    env: CloudflareEnv,
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      // Initialize AgentGate with policy from environment
      const agentGate = await createAgentGateForCloudflare(env)

      // Handle request with full AgentGate protection
      return handleCloudflareRequest(request, env, ctx, agentGate)
    } catch (error) {
      // Fallback: if AgentGate fails, pass through to origin
      console.error('AgentGate error, passing through:', error)
      return fetch(request)
    }
  },
}
