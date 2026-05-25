/**
 * Behavioral Fingerprinting Engine
 * Detects AI agents through behavioral analysis beyond simple headers:
 * - JS execution verification
 * - Request timing and ordering patterns
 * - Secondary resource requests (CSS, images)
 * - Screen/browser fingerprinting
 * - Navigation flow analysis
 */

export interface FingerprintData {
  jsExecuted: boolean
  screenWidth?: number
  screenHeight?: number
  colorDepth?: number
  timezone?: string
  cookiesEnabled?: boolean
  webdriver?: boolean
  languages?: string[]
  plugins?: string[]
  canvasFingerprint?: string
  touchSupport?: boolean
}

export interface RequestPattern {
  path: string
  timestamp: number
  type: 'html' | 'css' | 'js' | 'image' | 'font' | 'api' | 'other'
  contentType?: string
}

export interface SessionFingerprint {
  sessionId: string
  ip: string
  userAgent: string
  firstRequestAt: number
  lastRequestAt: number
  totalRequests: number
  patterns: RequestPattern[]
  jsVerified: boolean
  jsCookieSet: boolean
  hasSecondaryResources: boolean
  averageRequestInterval: number
  pathProgression: string[]
  apiWithoutHtml: boolean
  consecutiveTiming: number[] // ms between requests
  score: number // 0-100, fingerprint-only score
}

const SESSION_TTL_MS = 30 * 60 * 1000

export class SessionStore {
  private sessions = new Map<string, SessionFingerprint>()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(autoCleanup: boolean = true) {
    if (autoCleanup) {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000)
      this.cleanupInterval.unref?.()
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.sessions.clear()
  }

  cleanup(): void {
    const now = Date.now()
    for (const [id, session] of this.sessions) {
      if (now - session.lastRequestAt > SESSION_TTL_MS) {
        this.sessions.delete(id)
      }
    }
  }

  getOrCreate(sessionId: string, ip: string, userAgent: string): SessionFingerprint {
    let session = this.sessions.get(sessionId)
    if (!session) {
      session = {
        sessionId,
        ip,
        userAgent,
        firstRequestAt: Date.now(),
        lastRequestAt: Date.now(),
        totalRequests: 0,
        patterns: [],
        jsVerified: false,
        jsCookieSet: false,
        hasSecondaryResources: false,
        averageRequestInterval: 0,
        pathProgression: [],
        apiWithoutHtml: false,
        consecutiveTiming: [],
        score: 0,
      }
      this.sessions.set(sessionId, session)
    }
    return session
  }
}

export function recordRequest(
  session: SessionFingerprint,
  path: string,
  contentType?: string
): void {
  const now = Date.now()
  if (session.lastRequestAt > 0) {
    session.consecutiveTiming.push(now - session.lastRequestAt)
  }
  session.lastRequestAt = now
  session.totalRequests++
  session.pathProgression.push(path)

  const type = classifyRequest(path, contentType)
  session.patterns.push({ path, timestamp: now, type, contentType })

  if (type === 'css' || type === 'js' || type === 'image' || type === 'font') {
    session.hasSecondaryResources = true
  }

  // Check if API was accessed without prior HTML
  const htmlRequests = session.patterns.filter(p => p.type === 'html')
  if (type === 'api' && htmlRequests.length === 0) {
    session.apiWithoutHtml = true
  }

  // Calculate average interval
  if (session.consecutiveTiming.length > 0) {
    session.averageRequestInterval = session.consecutiveTiming.reduce((a, b) => a + b, 0) / session.consecutiveTiming.length
  }
}

export function setJsVerified(session: SessionFingerprint): void {
  session.jsVerified = true
}

export function setJsCookieDetected(session: SessionFingerprint): void {
  session.jsCookieSet = true
}

function classifyRequest(path: string, contentType?: string): RequestPattern['type'] {
  if (contentType) {
    if (contentType.startsWith('text/html')) return 'html'
    if (contentType.startsWith('text/css')) return 'css'
    if (contentType.startsWith('text/javascript') || contentType.startsWith('application/javascript')) return 'js'
    if (contentType.startsWith('image/')) return 'image'
    if (contentType.startsWith('font/')) return 'font'
    if (contentType.startsWith('application/json')) return 'api'
  }

  if (path.endsWith('.css')) return 'css'
  if (path.endsWith('.js')) return 'js'
  if (path.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i)) return 'image'
  if (path.match(/\.(woff|woff2|ttf|eot)$/i)) return 'font'
  if (path.startsWith('/api/')) return 'api'
  return 'other'
}

export function calculateFingerprintScore(session: SessionFingerprint): {
  score: number
  signals: Array<{ type: string; weight: number; evidence: string }>
} {
  const signals: Array<{ type: string; weight: number; evidence: string }> = []
  let score = 0

  // 1. No JS verification (weight: 15)
  if (!session.jsVerified && !session.jsCookieSet) {
    if (session.totalRequests >= 2) {
      // Only flag if they've made multiple requests without running JS
      signals.push({ type: 'no_js_execution', weight: 15, evidence: `${session.totalRequests} requests without JS` })
      score += 15
    }
  }

  // 2. No secondary resources (weight: 20)
  if (session.totalRequests >= 3 && !session.hasSecondaryResources) {
    signals.push({ type: 'no_secondary_resources', weight: 20, evidence: `${session.totalRequests} requests, all HTML/API` })
    score += 20
  }

  // 3. API accessed without HTML (weight: 25)
  if (session.apiWithoutHtml && session.totalRequests >= 1) {
    signals.push({ type: 'direct_api_access', weight: 25, evidence: 'API accessed without prior HTML request' })
    score += 25
  }

  // 4. Unusual timing patterns (weight: 10)
  if (session.consecutiveTiming.length >= 3) {
    const timings = session.consecutiveTiming
    const allSimilar = timings.every(t => Math.abs(t - timings[0]) < timings[0] * 0.2)
    const veryFast = timings.every(t => t < 100) // All requests under 100ms (no human reading time)

    if (allSimilar && timings.length >= 5) {
      signals.push({ type: 'robotic_timing', weight: 10, evidence: `${timings.length} requests with <20% variance` })
      score += 10
    }

    if (veryFast) {
      signals.push({ type: 'very_fast_requests', weight: 5, evidence: `All ${timings.length} requests under 100ms` })
      score += 5
    }
  }

  // 5. Suspicious path progression (weight: 10)
  if (session.pathProgression.length >= 5) {
    const uniquePaths = new Set(session.pathProgression)
    const allHoneypot = session.pathProgression.every(p =>
      p.startsWith('/agent-honeypot') || p.startsWith('/admin') || p.startsWith('/internal') ||
      p.startsWith('/secrets') || p.startsWith('/.env') || p.startsWith('/api/v2')
    )

    if (allHoneypot && uniquePaths.size >= 3) {
      signals.push({ type: 'honeypot_chain', weight: 15, evidence: `Visited ${uniquePaths.size} honeypot paths` })
      score += 15
    }

    // Sequential path traversal (a/b/c/d/e pattern)
    if (uniquePaths.size === session.pathProgression.length && uniquePaths.size >= 5) {
      signals.push({ type: 'sequential_paths', weight: 5, evidence: `${uniquePaths.size} unique sequential paths` })
      score += 5
    }
  }

  // 6. Missing screen/browser data from JS challenge (weight: 5)
  const hadJsChallenge = session.patterns.some(p => p.path === '/agent-challenge')
  if (hadJsChallenge && !session.jsVerified) {
    signals.push({ type: 'challenge_failed', weight: 25, evidence: 'Failed JS challenge' })
    score += 25
  }

  return {
    score: Math.min(score, 100),
    signals,
  }
}

export function generateJsChallenge(): string {
  return `(function(){
  // AgentGate Browser Verification
  var d = {
    js: true,
    sw: screen.width,
    sh: screen.height,
    cd: screen.colorDepth,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    ce: navigator.cookieEnabled,
    wd: navigator.webdriver,
    lang: navigator.language,
    langs: navigator.languages,
    touch: 'ontouchstart' in window,
    time: Date.now(),
    ref: document.referrer,
    url: window.location.href
  };
  
  // Canvas fingerprint
  try {
    var c = document.createElement('canvas');
    c.width = 200; c.height = 50;
    var ctx = c.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(0, 0, 200, 50);
    ctx.fillStyle = '#069';
    ctx.fillText('AgentGate☃♠', 2, 15);
    d.cf = c.toDataURL().slice(0, 100);
  } catch(e) {}
  
  // Set verification cookie
  document.cookie = 'agentgate_js=' + btoa(JSON.stringify(d)) + ';path=/;max-age=3600';
  
  // Report via beacon
  try {
    navigator.sendBeacon('/agentgate-verify', JSON.stringify(d));
  } catch(e) {
    var x = new XMLHttpRequest();
    x.open('POST', '/agentgate-verify', true);
    x.setRequestHeader('Content-Type', 'application/json');
    x.send(JSON.stringify(d));
  }
})();`
}

export function parseFingerprintCookie(cookieValue: string): FingerprintData | null {
  try {
    const decoded = atob(cookieValue)
    const raw = JSON.parse(decoded) as Record<string, unknown>
    // Map short browser API keys to our interface
    return {
      jsExecuted: raw.js === true,
      screenWidth: raw.sw as number | undefined,
      screenHeight: raw.sh as number | undefined,
      colorDepth: raw.cd as number | undefined,
      timezone: raw.tz as string | undefined,
      cookiesEnabled: raw.ce as boolean | undefined,
      webdriver: raw.wd as boolean | undefined,
      languages: raw.langs as string[] | undefined,
      touchSupport: raw.touch as boolean | undefined,
      canvasFingerprint: raw.cf as string | undefined,
    }
  } catch {
    return null
  }
}

export function generateChallengePage(redirectTo: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8">
<title>Agent Access Verification</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui;background:#0d1117;color:#e1e4e8;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem}
.card{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:2rem;max-width:500px;width:100%;text-align:center}
h1{font-size:1.5rem;margin-bottom:.5rem;color:#58a6ff}
p{color:#8b949e;margin-bottom:1.5rem;line-height:1.6}
.spinner{width:40px;height:40px;border:3px solid #30363d;border-top-color:#58a6ff;border-radius:50%;animation:spin .8s linear infinite;margin:1.5rem auto}
@keyframes spin{to{transform:rotate(360deg)}}
.status{color:#8b949e;font-size:.9rem}
.success{color:#238636;display:none;margin-top:1rem}
.redirect-btn{display:none;margin-top:1rem;padding:.75rem 1.5rem;background:#238636;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:1rem}
.redirect-btn:hover{background:#2ea043}
</style></head>
<body>
<div class="card">
<h1>🛡️ Access Verification</h1>
<p>Verifying your browser to ensure safe access. This helps us protect our content from unauthorized automated access.</p>
<div class="spinner" id="spinner"></div>
<p class="status" id="status">Running browser verification...</p>
<div class="success" id="success">
  <p style="color:#238636;font-size:1.2rem">✓ Verified</p>
  <p style="color:#8b949e">You are a real browser. Redirecting...</p>
</div>
<button class="redirect-btn" id="redirectBtn" onclick="window.location.href='${redirectTo}'">Continue →</button>
</div>
<script>${generateJsChallenge()}
// Wait for cookie and redirect
var check = setInterval(function() {
  if (document.cookie.indexOf('agentgate_js') >= 0) {
    clearInterval(check);
    document.getElementById('spinner').style.display = 'none';
    document.getElementById('status').style.display = 'none';
    document.getElementById('success').style.display = 'block';
    document.getElementById('redirectBtn').style.display = 'inline-block';
  }
}, 100);
// Timeout after 5s
setTimeout(function() {
  clearInterval(check);
  if (document.cookie.indexOf('agentgate_js') < 0) {
    document.getElementById('spinner').style.display = 'none';
    document.getElementById('status').textContent = 'Verification incomplete. Please enable JavaScript.';
  }
}, 5000);
</script></div></body></html>`
}
