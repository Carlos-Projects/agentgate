# Contributing

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
