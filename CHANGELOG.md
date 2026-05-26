# agentgate

## [Unreleased]

### Added
- Real `RateLimitStore` implementation with configurable backends
- Real `SessionManager` implementation with SSE-based session tracking
- Real `WebhookSender` implementation for event-driven alerts
- Real `RateLimiter` implementation with sliding window algorithm

## [0.2.0] - 2025-08-01

### Added
- Policy engine with YAML-based rule definitions
- Risk scoring for incoming agent requests
- Express middleware integration
- Next.js route handler integration
- Cloudflare Worker adapter
- SSE session tracking
- Honeypot endpoint generation
- Webhook notifications for security events

### Changed
- Restructured core modules into separate concerns

## [0.1.0] - 2025-05-01

### Added
- Initial project scaffolding
- TypeScript type definitions for policies and sessions
- Basic rate-limiting stubs
- Configuration loading from YAML
- CLI server entry point
