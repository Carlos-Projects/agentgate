import { describe, it, expect } from 'vitest'
import { normalizeRequest, extractClientIP, parseCookies } from '../src/core/normalize'

describe('normalizeRequest', () => {
  it('should map all AdapterRequest fields to RequestContext', () => {
    const result = normalizeRequest({
      ip: '192.168.1.1',
      path: '/test',
      method: 'POST',
      userAgent: 'TestBot/1.0',
      referer: 'https://example.com',
      acceptLanguage: 'en-US',
      cookies: { session: 'abc' },
      headers: { 'x-custom': 'value' },
      jsExecuted: true,
    })

    expect(result.ip).toBeDefined()
    expect(result.path).toBe('/test')
    expect(result.path).toBe('/test')
    expect(result.method).toBe('POST')
    expect(result.userAgent).toBe('TestBot/1.0')
    expect(result.referer).toBe('https://example.com')
    expect(result.acceptLanguage).toBe('en-US')
    expect(result.cookies).toEqual({ session: 'abc' })
    expect(result.headers).toEqual({ 'x-custom': 'value' })
    expect(result.jsExecuted).toBe(true)
    expect(result.timestamp).toBeGreaterThan(0)
  })

  it('should handle missing optional fields', () => {
    const result = normalizeRequest({
      ip: '10.0.0.1',
      path: '/',
      method: 'GET',
      userAgent: 'Agent/1.0',
      cookies: {},
      headers: {},
    })

    expect(result.referer).toBeUndefined()
    expect(result.acceptLanguage).toBeUndefined()
    expect(result.jsExecuted).toBeUndefined()
  })

  it('should default missing userAgent to empty string', () => {
    const result = normalizeRequest({
      ip: '::1',
      path: '/',
      method: 'GET',
      userAgent: '',
      cookies: {},
      headers: {},
    })
    expect(result.userAgent).toBe('')
  })

  it('should default missing cookies to empty object', () => {
    const result = normalizeRequest({
      ip: '10.0.0.1',
      path: '/',
      method: 'GET',
      userAgent: 'Test',
      cookies: {} as Record<string, string>,
      headers: {},
    })
    expect(result.cookies).toEqual({})
  })
})

describe('extractClientIP', () => {
  it('should prefer x-forwarded-for', () => {
    const ip = extractClientIP({
      'x-forwarded-for': '203.0.113.1, 10.0.0.1',
      'x-real-ip': '198.51.100.1',
    })
    expect(ip).toBe('203.0.113.1')
  })

  it('should fall back to x-real-ip', () => {
    const ip = extractClientIP({
      'x-real-ip': '198.51.100.1',
    })
    expect(ip).toBe('198.51.100.1')
  })

  it('should handle cf-connecting-ip', () => {
    const ip = extractClientIP({
      'cf-connecting-ip': '2001:db8::1',
    })
    expect(ip).toBe('2001:db8::1')
  })

  it('should return unknown when no headers', () => {
    const ip = extractClientIP({})
    expect(ip).toBe('unknown')
  })
})

describe('parseCookies', () => {
  it('should parse standard cookie header', () => {
    const result = parseCookies('session=abc123; theme=dark; lang=en-US')
    expect(result).toEqual({ session: 'abc123', theme: 'dark', 'lang': 'en-US' })
  })

  it('should handle empty cookie header', () => {
    expect(parseCookies('')).toEqual({})
    expect(parseCookies(undefined)).toEqual({})
  })

  it('should handle values with equals signs', () => {
    const result = parseCookies('token=base64encoded==data')
    expect(result.token).toBe('base64encoded==data')
  })

  it('should trim whitespace from keys and values', () => {
    const result = parseCookies(' session = abc123 ; theme = dark ')
    expect(result).toEqual({ session: 'abc123', theme: 'dark' })
  })
})
