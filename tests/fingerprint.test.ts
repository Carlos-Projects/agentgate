import { describe, it, expect, beforeEach } from 'vitest'
import {
  SessionStore,
  recordRequest,
  setJsVerified,
  setJsCookieDetected,
  calculateFingerprintScore,
  generateJsChallenge,
  parseFingerprintCookie,
  generateChallengePage,
} from '../src/core/fingerprint'

describe('Fingerprint Engine', () => {
  let store: SessionStore

  beforeEach(() => {
    store = new SessionStore(false)
  })

  it('should create and retrieve sessions', () => {
    const session = store.getOrCreate('test-session-1', '192.168.1.1', 'TestBot/1.0')
    expect(session.sessionId).toBe('test-session-1')
    expect(session.totalRequests).toBe(0)
    expect(session.ip).toBe('192.168.1.1')

    const same = store.getOrCreate('test-session-1', '192.168.1.1', 'TestBot/1.0')
    expect(same).toBe(session)
  })

  it('should track request patterns', () => {
    const session = store.getOrCreate('test-patterns', '10.0.0.1', 'Mozilla/5.0')
    recordRequest(session, '/', 'text/html')
    recordRequest(session, '/style.css', 'text/css')
    recordRequest(session, '/script.js', 'text/javascript')

    expect(session.totalRequests).toBe(3)
    expect(session.hasSecondaryResources).toBe(true)
    expect(session.pathProgression).toEqual(['/', '/style.css', '/script.js'])
  })

  it('should detect API without HTML', () => {
    const session = store.getOrCreate('test-api', '10.0.0.1', 'ScraperBot/1.0')
    recordRequest(session, '/api/v2/users', 'application/json')
    expect(session.apiWithoutHtml).toBe(true)
  })

  it('should calculate high score for no JS + API-only', () => {
    const session = store.getOrCreate('test-score', '10.0.0.1', 'ScraperBot/1.0')
    recordRequest(session, '/api/v2/users', 'application/json')
    recordRequest(session, '/api/v2/orders', 'application/json')
    recordRequest(session, '/api/v2/internal/config', 'application/json')

    const result = calculateFingerprintScore(session)
    expect(result.score).toBeGreaterThan(0)
    expect(result.signals.length).toBeGreaterThanOrEqual(1)
  })

  it('should detect JS verification', () => {
    const session = store.getOrCreate('test-js', '10.0.0.1', 'Mozilla/5.0')
    recordRequest(session, '/', 'text/html')
    recordRequest(session, '/style.css', 'text/css')

    const before = calculateFingerprintScore(session)
    expect(before.score).toBeGreaterThan(0)

    setJsVerified(session)
    setJsCookieDetected(session)
    const after = calculateFingerprintScore(session)
    expect(after.score).toBeLessThan(before.score)
  })

  it('should generate JS challenge code', () => {
    const code = generateJsChallenge()
    expect(code).toContain('agentgate_js')
    expect(code).toContain('navigator.webdriver')
    expect(code).toContain('screen.width')
  })

  it('should generate challenge page', () => {
    const page = generateChallengePage('/admin')
    expect(page).toContain('Access Verification')
    expect(page).toContain('/admin')
    expect(page).toContain('agentgate_js')
  })

  it('should parse fingerprint cookie', () => {
    const data = { js: true, sw: 1920, sh: 1080, time: Date.now(), ce: true, wd: false }
    const cookie = btoa(JSON.stringify(data))
    const parsed = parseFingerprintCookie(cookie)
    expect(parsed).not.toBeNull()
    expect(parsed?.screenWidth).toBe(1920)
    expect(parsed?.screenHeight).toBe(1080)
    expect(parsed?.cookiesEnabled).toBe(true)
    expect(parsed?.webdriver).toBe(false)
  })

  it('should detect robotic timing', () => {
    const session = store.getOrCreate('test-robotic', '10.0.0.1', 'Mozilla/5.0')
    const paths = ['/', '/about', '/products', '/contact', '/blog', '/pricing']
    session.consecutiveTiming = [50, 50, 50, 50, 50]
    session.totalRequests = paths.length
    session.pathProgression = paths

    const result = calculateFingerprintScore(session)
    const hasRobotic = result.signals.some(s => s.type === 'robotic_timing')
    expect(hasRobotic).toBe(true)
  })

  it('should detect honeypot chain', () => {
    const session = store.getOrCreate('test-chain', '10.0.0.1', 'GPTBot/1.0')
    const honeypotPaths = ['/admin', '/internal/docs', '/secrets.env', '/.env', '/api/v2/users']
    honeypotPaths.forEach(p => recordRequest(session, p, 'text/html'))

    const result = calculateFingerprintScore(session)
    const hasHoneypotChain = result.signals.some(s => s.type === 'honeypot_chain')
    expect(hasHoneypotChain).toBe(true)
  })
})
