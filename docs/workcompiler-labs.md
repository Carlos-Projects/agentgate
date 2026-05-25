# AgentGate - WorkCompiler Labs Documentation

## Project Overview

**AgentGate** es una capa de control de acceso para agentes de IA que acceden a sitios web. Proporciona un firewall programable basado en políticas que detecta, clasifica y controla el tráfico automatizado.

## Stack Tecnológico

- **Runtime**: Node.js 18+
- **Lenguaje**: TypeScript 5.3+
- **Build**: tsc
- **Testing**: Vitest
- **Config**: YAML (js-yaml)
- **Frameworks**: Next.js, Express (adapters)

## Estructura del Proyecto

```
agentgate/
├── src/
│   ├── core/           # Lógica principal (runtime-agnostic)
│   │   ├── types.ts    # Definiciones de tipos
│   │   ├── detect.ts   # Detección de señales
│   │   ├── score.ts    # Cálculo de riesgo
│   │   ├── policy.ts   # Motor de políticas
│   │   ├── decide.ts   # Toma de decisiones
│   │   └── normalize.ts# Normalización de requests
│   ├── adapters/       # Integraciones con frameworks
│   │   ├── nextjs.ts
│   │   └── express.ts
│   ├── honeypot/       # Generadores de honeypots
│   │   ├── static.ts
│   │   └── dynamic.ts
│   ├── logger/         # Backends de logging
│   │   ├── jsonl.ts
│   │   └── console.ts
│   ├── dashboard/      # Utilidades para dashboard
│   │   ├── readLogs.ts
│   │   └── summarize.ts
│   └── index.ts        # Export principal
├── config/
│   └── agent-policy.example.yaml
├── examples/
│   └── nextjs-demo/
├── tests/
│   ├── detect.test.ts
│   ├── score.test.ts
│   ├── policy.test.ts
│   ├── decide.test.ts
│   └── honeypot.test.ts
└── docs/
    ├── architecture.md
    ├── threat-model.md
    └── policy-format.md
```

## Componentes Principales

### 1. Core (src/core/)

**Tipos** (`types.ts`):
- `AgentGateAction`: 'allow' | 'limited' | 'challenge' | 'sandbox' | 'block' | 'log_only'
- `SignalType`: Tipos de señales detectables
- `RequestContext`: Request normalizado
- `DecisionResult`: Resultado de decisión
- `AgentPolicy`: Configuración de política

**Detección** (`detect.ts`):
- Extrae señales de User-Agent, headers, comportamiento
- Detecta honeypot hits
- Identifica patrones sospechosos

**Scoring** (`score.ts`):
- Calcula score 0-100 basado en señales
- Configurable vía YAML
- Determina acción basada en thresholds

**Policy** (`policy.ts`):
- Carga configuración YAML
- Merge con defaults
- Match de paths y agentes

**Decisión** (`decide.ts`):
- Combina score + policy
- Prioridad: path > agent > score
- Genera headers de debug

### 2. Adapters (src/adapters/)

**Next.js**:
- `normalizeNextRequest`: NextRequest → AdapterRequest
- `createNextResponse`: DecisionResult → NextResponse
- `handleNextMiddleware`: Handler completo

**Express**:
- `normalizeExpressRequest`: Request → AdapterRequest
- `createExpressMiddleware`: Middleware factory

### 3. Honeypots (src/honeypot/)

**Static**:
- URLs predefinidas
- Validación simple
- Sin overhead criptográfico

**Dynamic**:
- Tokens HMAC firmados
- Expiración temporal
- Previene replay attacks

### 4. Logger (src/logger/)

**JSONL**:
- Archivo append-only
- Rotación automática
- Queryable con herramientas estándar

**Console**:
- Output coloreado
- Modo verbose
- Para desarrollo

### 5. Dashboard (src/dashboard/)

**readLogs**:
- Lee archivo JSONL
- Filtra por acción, path, score
- Paginación

**summarize**:
- Agrega estadísticas
- Distribución de scores
- Top user agents y paths

## Flujo de Request

```
1. Request llega al middleware (Next.js/Express)
2. Adapter normaliza a RequestContext
3. Detector extrae señales
4. Scorer calcula risk score
5. Policy engine aplica reglas
6. Decision engine determina acción
7. Logger registra entrada
8. Response se genera (allow/block/redirect)
```

## Configuración

### agent-policy.yaml

```yaml
mode: log_only  # o 'enforce'

defaults:
  action: allow
  expose_debug_headers: true

approved_agents:
  - name: Googlebot
    action: allow

known_ai_agents:
  - GPTBot
  - ClaudeBot

paths:
  /admin/*:
    action: block
  /api/*:
    action: challenge

scoring:
  weights:
    known_ai_user_agent: 25
    honeypot_hit: 50
  thresholds:
    allow: 0
    limited: 30
    challenge: 55
    sandbox: 70
    block: 90

honeypots:
  - /agent-honeypot
  - /bot-trap
```

## Uso en Next.js

### middleware.ts

```typescript
import { createAgentGate, loadPolicy, createJsonlLogger } from 'agentgate';

const policy = loadPolicy('./agent-policy.yaml');
const agentGate = createAgentGate({
  policy,
  logger: createJsonlLogger(),
});

export async function middleware(request: NextRequest) {
  const result = await agentGate.processRequest({
    ip: request.headers.get('x-forwarded-for') || 'unknown',
    path: request.nextUrl.pathname,
    method: request.method,
    userAgent: request.headers.get('user-agent') || '',
    cookies: Object.fromEntries(request.cookies),
    headers: Object.fromEntries(request.headers),
  });

  if (result.action === 'block') {
    return new NextResponse('Blocked', { status: 403 });
  }

  if (result.redirectPath) {
    return NextResponse.redirect(result.redirectPath);
  }

  return NextResponse.next();
}
```

## Testing

```bash
# Instalar dependencias
npm install

# Correr tests
npm test

# Build
npm run build

# Lint
npm run lint
```

## Dashboard

Visita `/agentgate-dashboard` para ver:
- Total requests
- Suspected agents
- Score distribution
- Actions taken
- Honeypot hits
- Recent events

## Roadmap

### Phase 1 (MVP) ✅
- [x] Core scoring engine
- [x] Policy loader
- [x] Next.js adapter
- [x] JSONL logger
- [x] Static honeypots
- [x] Dashboard básico

### Phase 2 (Próximas 2-4 semanas)
- [ ] Cloudflare Workers adapter
- [ ] SQLite logger
- [ ] Rate limiting con Redis
- [ ] Dynamic honeypots mejorados
- [ ] Dashboard authentication

### Phase 3 (Futuro)
- [ ] Qwen classifier opcional
- [ ] API monetization
- [ ] Browser fingerprinting
- [ ] SaaS dashboard

## Consideraciones de Producción

1. **Empezar en `log_only`**: 1-2 semanas de observación
2. **Proteger dashboard**: Añadir autenticación
3. **Rotar logs**: Configurar maxFileSize
4. **Debug headers**: Desactivar en producción
5. **Secrets**: Cambiar default de dynamic honeypots
6. **CDN**: Integrar con Cloudflare/Akamai
7. **Monitoreo**: Alertas para honeypot hits altos

## Licencia

MIT
