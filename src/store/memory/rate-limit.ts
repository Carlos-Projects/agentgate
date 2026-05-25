/**
 * In-Memory Rate Limit Store
 * Sliding window implementation for development/demo/low-traffic
 * 
 * WARNING: Not suitable for production high-traffic scenarios.
 * Use Redis store for production.
 */

import { RateLimitStore, RateLimitCheckResult } from '../types'

interface WindowEntry {
  timestamp: number
  id: string
}

const MAX_ENTRIES_PER_KEY = 1000
const DEFAULT_MAX_AGE_MS = 120000 // 2 minutes

export class MemoryRateLimitStore implements RateLimitStore {
  private windows: Map<string, WindowEntry[]> = new Map()
  private cleanupInterval?: NodeJS.Timeout

  constructor() {
    this.startCleanup()
  }

  async check(
    keys: string[],
    windowMs: number,
    maxRequests: number
  ): Promise<RateLimitCheckResult> {
    const now = Date.now()
    const windowStart = now - windowMs
    let worstRemaining = maxRequests
    let worstResetAt = now + windowMs
    let worstLimited = false

    for (const key of keys) {
      const entries = this.windows.get(key) || []
      
      // Sliding window: filter out entries outside the window
      const validEntries = entries.filter(e => e.timestamp > windowStart)
      
      // Update stored entries (cleanup old ones)
      if (validEntries.length !== entries.length) {
        this.windows.set(key, validEntries)
      }

      const count = validEntries.length
      const remaining = Math.max(0, maxRequests - count)
      const oldestEntry = validEntries[0]
      const resetAt = oldestEntry ? oldestEntry.timestamp + windowMs : now + windowMs

      if (count >= maxRequests) {
        worstLimited = true
      }

      if (remaining < worstRemaining) {
        worstRemaining = remaining
        worstResetAt = resetAt
      }
    }

    return {
      limited: worstLimited,
      remaining: worstRemaining,
      resetAt: worstResetAt,
    }
  }

  async record(keys: string[], windowMs: number): Promise<void> {
    const now = Date.now()
    const id = `${now}-${Math.random().toString(36).slice(2)}`

    for (const key of keys) {
      const entries = this.windows.get(key) || []
      
      // Limit growth per key
      if (entries.length >= MAX_ENTRIES_PER_KEY) {
        // Remove oldest entries to make room
        entries.splice(0, entries.length - MAX_ENTRIES_PER_KEY + 1)
      }
      
      entries.push({ timestamp: now, id })
      this.windows.set(key, entries)
    }
  }

  async reset(key: string): Promise<void> {
    this.windows.delete(key)
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      
      for (const [key, entries] of this.windows.entries()) {
        const valid = entries.filter(e => now - e.timestamp < DEFAULT_MAX_AGE_MS)
        if (valid.length === 0) {
          this.windows.delete(key)
        } else if (valid.length !== entries.length) {
          this.windows.set(key, valid)
        }
      }
    }, 30000)

    // Prevent blocking process exit in Node.js
    if (typeof this.cleanupInterval.unref === 'function') {
      this.cleanupInterval.unref()
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }
}
