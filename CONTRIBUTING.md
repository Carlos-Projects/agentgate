# Contributing to AgentGate

👋 **Welcome to AgentGate!**

Thank you for your interest in building policy-based firewall and honeypot middleware for AI agents. Your contributions — whether code, docs, ideas, or bug reports — are what make this project great. We're excited to have you with us!

## First Time Contributor?

New to TypeScript or security middleware? No problem!

- Look for `good first issue` or `help wanted` labels
- Improve test coverage or add edge case tests
- Add a new policy rule example
- Fix a typo or improve documentation

Every contribution helps, no matter how small. We're here to guide you.

## Need Help?

Got a question or hit a wall?

- Open a [GitHub Issue](https://github.com/Carlos-Projects/agentgate/issues)
- Search existing issues for answers
- Include details: Node version, OS, what you tried

## Development Setup

```bash
git clone https://github.com/Carlos-Projects/agentgate.git
cd agentgate
npm install
```

## Workflow

1. Create a branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Run checks: `npm run lint && npm test`
4. Add tests for new functionality
5. Commit: `git commit -m "type(scope): description"`
6. Push and open a PR

## Quality Gates

Before submitting a PR, ensure:

- `npm run lint` — eslint passes
- `npm test` — vitest passes
- Tests added for new features

## Code Style

- TypeScript strict mode
- eslint enforces imports, naming, and formatting
- Type hints required for all public APIs

## Pull Request Process

1. Use the PR template
2. Keep PRs focused on a single change
3. Reference related issues
4. Squash commits before merging

---

💡 This project is governed by a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold its principles.
