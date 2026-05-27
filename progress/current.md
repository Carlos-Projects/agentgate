# Current State

Status: active
Last updated: 2026-05-26

## Current Goal

Install a portable Codex/OpenCode harness and align AgentGate as the web perimeter companion to MCPGuard.

## Known Good Commands

- setup: `npm install`
- test: `npm test`
- lint: `npm run lint`
- build/typecheck: `npm run build`

## Open Risks

- Webhook SSRF and trusted proxy configuration remain high-impact production concerns.
- Policy loading must remain hardened against prototype pollution and unsafe YAML/JSON.
- Events should normalize to the shared taxonomy so ThreatLens/MCPscop can correlate them.

## Next Step

- Add taxonomy-compatible event export and ThreatLens forwarding plan.
