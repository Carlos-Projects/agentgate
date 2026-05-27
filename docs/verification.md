# Verification

## Minimal Check

Run this before claiming a change works:

```bash
npm test
```

## Full Check

```bash
npm run lint
npm run build
npm test
```

## Security Check

```bash
npm audit
git diff --check
rg -n "(api[_-]?key|token|secret|password)\\s*[:=]\\s*['\\\"][^'\\\"]+" .
```

## Evidence Standard

Paste only summaries in chat. Keep full outputs in `reports/` when useful.
