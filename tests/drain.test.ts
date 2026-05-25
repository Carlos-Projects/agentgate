import { describe, it, expect } from 'vitest'
import { LargePageDrain, SlowStreamDrain, RecursiveNavigationDrain } from '../src/honeypot/drain'

describe('LargePageDrain', () => {
  it('should generate content at requested size', () => {
    const drain = new LargePageDrain()
    const result = drain.generate(1, 10_000)
    expect(result.contentType).toBe('text/html')
    expect(result.body.length).toBeGreaterThan(1000)
    expect(result.approximateTokens).toBeGreaterThan(0)
    expect(result.delayMs).toBeGreaterThanOrEqual(0)
  })

  it('should generate larger content for higher visit numbers', () => {
    const drain = new LargePageDrain()
    const small = drain.generate(1, 10_000)
    const large = drain.generate(5, 10_000)
    expect(large.body.length).toBeGreaterThan(small.body.length)
  })
})

describe('SlowStreamDrain', () => {
  it('should generate deeply nested JSON', () => {
    const drain = new SlowStreamDrain()
    const result = drain.generate()
    expect(result.contentType).toBe('application/json')
    expect(result.body).toContain('level_0')
    expect(result.body).toContain('level_19')
    expect(result.delayMs).toBeGreaterThan(0)
  })
})

describe('RecursiveNavigationDrain', () => {
  it('should generate page with links at depth 0', () => {
    const drain = new RecursiveNavigationDrain()
    const result = drain.generate(0, 5)
    expect(result.contentType).toBe('text/html')
    expect(result.body).toContain('Level 1')
    expect(result.body).toContain('1/5')
    expect(result.body).not.toContain('Level 5') // depth 0 only shows level 1
  })

  it('should increase delay with depth', () => {
    const drain = new RecursiveNavigationDrain()
    const shallow = drain.generate(0)
    const deep = drain.generate(10)
    expect(deep.delayMs).toBeGreaterThan(shallow.delayMs)
  })
})
