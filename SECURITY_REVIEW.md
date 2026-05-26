# AgentGate v0.2.0 - Security Review

**Date**: 2026-05-25  
**Version**: 0.2.0  
**Reviewer**: Automated Security Analysis  
**Status**: ⚠️ REQUIRES ATTENTION

---

## Executive Summary

AgentGate es una herramienta de seguridad diseñada para proteger sitios web contra scraping automatizado y agentes de IA no autorizados. Esta revisión identifica **5 vulnerabilidades críticas**, **8 problemas de severidad media**, y **12 recomendaciones de mejora**.

### Risk Score: **6.5/10** (Medium-High)

El núcleo de seguridad es sólido, pero hay problemas de implementación que deben addressed antes de producción.

---

## 🔴 Vulnerabilidades Críticas

### 1. **Session Manager Stub Implementation**
**Severity**: CRITICAL (9.8)  
**File**: `src/session/index.ts`  
**Status**: ⚠️ NOT IMPLEMENTED

```typescript
// ACTUAL CODE - STUB IMPLEMENTATION
export class SessionManager {
  constructor(_store: any, _config: any) {}
  async getOrCreateSession(_ip: string, _ua: string, _cookie?: string): Promise<any> {
    return { session: { id: crypto.randomUUID(), ip: _ip, userAgent: _ua, firstSeen: Date.now(), lastSeen: Date.now() }, isNew: true, isFallback: false }
  }
  async updateSession(_id: string, _input: unknown): Promise<void> {}
  async close(): Promise<void> {}
}
```

**Issues**:
- ❌ No usa el store pasado como parámetro
- ❌ No hay persistencia de sesiones
- ❌ No hay validación de cookies
- ❌ No hay fingerprint fallback
- ❌ No hay detección de patrones repetidos
- ❌ Almacena IP sin hashear (privacy violation)
- ❌ `updateSession()` es no-op (no tracking real)

**Impact**: Session tracking completamente no funcional. Rate limiting puede ser evadido.

**Fix Required**:
```typescript
export class SessionManager {
  private store: SessionStore
  private config: SessionConfig
  
  constructor(store: SessionStore, config: SessionConfig) {
    this.store = store
    this.config = config
  }
  
  async getOrCreateSession(ip: string, ua: string, cookie?: string): Promise<SessionResult> {
    // TODO: Implement proper session management
    // - Hash IP before storage
    // - Validate existing cookie
    // - Create fingerprint fallback
    // - Store with TTL
  }
}
```

---

### 2. **Rate Limiter - Race Condition**
**Severity**: CRITICAL (9.1)  
**File**: `src/rate-limit/index.ts`  
**Status**: ⚠️ LOGIC ERROR

```typescript
async check(key: string | string[]): Promise<RateLimitCheckResult> {
  const keys = typeof key === 'string' ? [key] : key
  const result = await this.store.check(keys, this.config.windowMs, this.config.maxRequests)
  if (!result.limited) {
    await this.store.record(keys, this.config.windowMs)  // RACE CONDITION
  }
  return result
}
```

**Issue**: El check y record no son atómicos. Entre el check y el record, otra request puede pasar.

**Attack Vector**:
```
T0: Request A check() → allowed (count: 59/60)
T1: Request B check() → allowed (count: 59/60)  # RACE!
T2: Request A record() → (count: 60)
T3: Request B record() → (count: 61)  # EXCEEDED!
```

**Fix Required**:
```typescript
async check(key: string | string[]): Promise<RateLimitCheckResult> {
  const keys = typeof key === 'string' ? [key] : key
  // RECORD FIRST, then check (strict mode)
  await this.store.record(keys, this.config.windowMs)
  const result = await this.store.check(keys, this.config.windowMs, this.config.maxRequests)
  return result
}
```

---

### 3. **Webhook SSRF Vulnerability**
**Severity**: CRITICAL (8.6)  
**File**: `src/webhooks/index.ts`  
**Status**: ⚠️ VULNERABLE

```typescript
const url = new URL(target.url)
const isHttps = url.protocol === 'https:'
const lib = isHttps ? https : http

const req = lib.request(url, { ... })
```

**Issues**:
- ❌ Permite HTTP (no solo HTTPS)
- ❌ No valida que el URL no apunte a red interna
- ❌ No hay whitelist de dominios
- ❌ Follows redirects (potencial para SSRF)

**Attack Vector**:
```yaml
webhooks:
  targets:
    - name: "evil"
      url: "http://169.254.169.254/latest/meta-data/"  # AWS metadata
      events: ["*"]
```

**Fix Required**:
```typescript
private validateUrl(url: string): boolean {
  const parsed = new URL(url)
  
  // Only HTTPS
  if (parsed.protocol !== 'https:') return false
  
  // Block private IPs
  const ip = dns.lookup(parsed.hostname)
  if (isPrivateIP(ip)) return false
  
  // Block localhost
  if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') return false
  
  return true
}
```

---

### 4. **IP Header Trust - Request Smuggling**
**Severity**: HIGH (7.5)  
**File**: `src/core/normalize.ts`  
**Status**: ⚠️ VULNERABLE

```typescript
export function extractClientIP(headers: Record<string, string>): string {
  const ipHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',
    // ...
  ]
  // Trust first header found
}
```

**Issue**: Si el servidor no está detrás de un proxy confiable, un atacante puede spoofear su IP.

**Attack**:
```bash
curl -H "X-Forwarded-For: 1.2.3.4" https://target.com
# AgentGate thinks request is from 1.2.3.4
```

**Fix Required**:
```typescript
export function extractClientIP(
  headers: Record<string, string>,
  trustedProxies?: string[]
): string {
  // Si no hay trusted proxies, usar socket.remoteAddress
  if (!trustedProxies || trustedProxies.length === 0) {
    return headers['x-real-socket-ip'] || 'unknown'
  }
  
  // Validar que el request viene de un proxy confiable
  const socketIP = headers['x-socket-ip']
  if (!trustedProxies.includes(socketIP)) {
    return socketIP  // No confiar en headers
  }
  
  // Ahora sí, usar X-Forwarded-For
  return headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown'
}
```

---

### 5. **YAML Prototype Pollution**
**Severity**: HIGH (7.4)  
**File**: `src/core/policy.ts`  
**Status**: ✅ PARTIALLY MITIGATED

```typescript
function stripProto(v: unknown): unknown {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return v
  const clean: Record<string, unknown> = Object.create(null)
  for (const key of Object.keys(v as Record<string, unknown>)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue
    clean[key] = stripProto((v as Record<string, unknown>)[key])
  }
  return clean
}
```

**Good**: ✅ Implementa `stripProto()`  
**Bad**: ❌ No se usa en todos los lugares  
**Bad**: ❌ `js-yaml` v4 tiene vulnerabilidades conocidas

**Fix Required**:
- Usar `js-yaml` con `schema: FAILSAFE` o
- Migrar a JSON para configuración crítica
- Aplicar `stripProto()` en TODOS los inputs de usuario

---

## 🟡 Problemas de Severidad Media

### 6. **Cookie Parsing - DoS Potential**
**Severity**: MEDIUM (5.3)  
**File**: `src/core/normalize.ts`  
**Status**: ✅ PARTIALLY MITIGATED

```typescript
const MAX_COOKIES = 50
const MAX_COOKIE_KEY_LENGTH = 128
const MAX_COOKIE_VALUE_LENGTH = 4096
```

**Good**: ✅ Tiene límites  
**Issue**: ❌ No valida encoding (UTF-8 bomb possible)

---

### 7. **Log File Path Traversal**
**Severity**: MEDIUM (5.0)  
**File**: `src/logger/jsonl.ts`  
**Status**: ⚠️ VULNERABLE

```typescript
constructor(options: JsonlLoggerOptions = {}) {
  this.options = { ...DEFAULT_OPTIONS, ...options }
}

getFilePath(): string {
  return path.resolve(this.options.filePath)  // No validation
}
```

**Attack**:
```typescript
createJsonlLogger({ filePath: '../../../etc/passwd' })
```

**Fix**:
```typescript
const safePath = path.resolve(options.filePath || './logs.jsonl')
if (!safePath.startsWith(process.cwd())) {
  throw new Error('Invalid log path')
}
```

---

### 8. **Missing Input Validation en Rate Limit Keys**
**Severity**: MEDIUM (4.7)  
**File**: `src/rate-limit/index.ts`  
**Status**: ⚠️ VULNERABLE

```typescript
async check(key: string | string[]): Promise<RateLimitCheckResult>
```

**Issue**: No sanitización de keys. Podría inyectar keys maliciosas.

---

### 9. **Redis Key Namespace Collision**
**Severity**: MEDIUM (4.5)  
**File**: `src/store/redis/rate-limit.ts`  
**Status**: ⚠️ MISSING PREFIX

```typescript
// No key prefix by default
const redisKey = `rl:${key}`  # Could collide with other apps
```

**Fix**:
```typescript
const prefix = config.keyPrefix || `agentgate:${process.env.HOSTNAME || 'default'}:`
const redisKey = `${prefix}:rl:${key}`
```

---

### 10. **No Rate Limiting en Dashboard**
**Severity**: MEDIUM (4.3)  
**File**: `examples/nextjs-demo/app/agentgate-dashboard/page.tsx`  
**Status**: ⚠️ VULNERABLE

El dashboard puede ser scrapeado sin límites.

---

### 11. **Webhook Timeout Too Long**
**Severity**: LOW (3.5)  
**File**: `src/webhooks/index.ts`  
**Status**: ⚠️ SUBOPTIMAL

```typescript
timeout: 10_000  // 10 segundos es mucho
```

**Recommendation**: 3-5 segundos máximo

---

### 12. **No Audit Logging para Decisiones Críticas**
**Severity**: LOW (3.0)  
**Status**: ⚠️ MISSING

Decisiones de block/sandbox deberían loguearse con más detalle.

---

### 13. **Memory Leak en setInterval**
**Severity**: LOW (2.5)  
**File**: `src/core/detect.ts`, `src/core/fingerprint.ts`  
**Status**: ⚠️ POTENTIAL LEAK

```typescript
const RATE_CLEANUP_INTERVAL = setInterval(() => { ... })
// Nunca se hace clearInterval()
```

---

## ✅ Aspectos Positivos

1. ✅ **IP Hashing** - Privacy-by-design (cuando se implementa)
2. ✅ **Policy Validation** - Validación temprana de configuración
3. ✅ **Webhook Signing** - HMAC-SHA256 para integridad
4. ✅ **Cookie Limits** - Protección contra DoS
5. ✅ **No eval()/Function()** - Sin código dinámico peligroso
6. ✅ **TypeScript** - Type safety ayuda a prevenir bugs

---

## 📋 Recomendaciones de Seguridad

### Prioridad Alta (Antes de Producción)

1. **Implementar SessionManager correctamente**
   - Usar store pasado como parámetro
   - Hashear IPs antes de almacenar
   - Implementar fingerprint fallback
   - Agregar detección de patrones

2. **Fix Race Condition en Rate Limiter**
   - Record antes que check (strict mode)
   - Considerar operaciones atómicas en Redis

3. **Prevenir SSRF en Webhooks**
   - Solo HTTPS
   - Validar que no sea red interna
   - Implementar whitelist de dominios

4. **Validar Trusted Proxies**
   - No confiar en X-Forwarded-For por defecto
   - Requerir configuración explícita de proxies

5. **Sanitizar Log File Paths**
   - Prevenir path traversal
   - Validar que esté dentro del directorio permitido

### Prioridad Media

6. **Agregar Rate Limiting al Dashboard**
7. **Reducir Webhook Timeout** (10s → 3s)
8. **Agregar Key Prefix en Redis**
9. **Fix Memory Leaks** (clearInterval)
10. **Audit Logging para decisiones críticas**

### Prioridad Baja

11. **Considerar migrar YAML → JSON** (menor superficie de ataque)
12. **Agregar Content Security Policy headers**
13. **Documentar security considerations en README**

---

## 🔐 Security Checklist para Producción

- [ ] SessionManager implementado correctamente
- [ ] Rate limiter race condition fixed
- [ ] Webhook SSRF prevention implementado
- [ ] Trusted proxies configurados
- [ ] Log file paths sanitizados
- [ ] Dashboard rate limited
- [ ] Memory leaks fixed
- [ ] Redis key prefixes configurados
- [ ] Webhook timeout reducido
- [ ] Audit logging habilitado

---

## Conclusión

AgentGate tiene una **arquitectura de seguridad sólida** pero la **implementación actual tiene gaps críticos** que deben addressed antes de producción.

**Recomendación**: **NO DEPLOY EN PRODUCCIÓN** hasta que las vulnerabilidades críticas (1-5) sean resueltas.

**Timeline Estimado para Fixes**: 2-3 días de desarrollo

---

**Next Steps**:
1. Crear issues en GitHub para cada vulnerabilidad crítica
2. Priorizar fixes de SessionManager y Rate Limiter
3. Re-test después de fixes
4. Considerar bug bounty program para v0.2.1

