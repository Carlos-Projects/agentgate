import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { JsonlLogger, createJsonlLogger } from '../src/logger/jsonl'
import { ConsoleLogger, createConsoleLogger } from '../src/logger/console'

function tmpLogFile(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-log-'))
  return path.join(dir, 'test.jsonl')
}

describe('JsonlLogger', () => {
  it('should write log entries to file', async () => {
    const logPath = tmpLogFile()
    const logger = createJsonlLogger({ filePath: logPath, maxSizeBytes: 10_000_000 })
    await logger.log({
      timestamp: '2026-01-01T00:00:00Z',
      ip: '10.0.0.1',
      path: '/test',
      userAgent: 'TestBot',
      score: 50,
      action: 'block',
      signals: ['known_ai_user_agent'],
    })

    const content = fs.readFileSync(logPath, 'utf-8')
    const lines = content.trim().split('\n')
    expect(lines.length).toBe(1)

    const entry = JSON.parse(lines[0])
    expect(entry.ip).toBe('10.0.0.1')
    expect(entry.score).toBe(50)
    expect(entry.action).toBe('block')
    fs.rmSync(path.dirname(logPath), { recursive: true, force: true })
  })

  it('should read back log entries', async () => {
    const logPath = tmpLogFile()
    const logger = createJsonlLogger({ filePath: logPath, maxSizeBytes: 10_000_000 })
    await logger.log({
      timestamp: '2026-01-01T00:00:00Z', ip: '10.0.0.1', path: '/a',
      userAgent: 'A', score: 10, action: 'allow', signals: [],
    })
    await logger.log({
      timestamp: '2026-01-01T00:00:01Z', ip: '10.0.0.2', path: '/b',
      userAgent: 'B', score: 80, action: 'block', signals: ['honeypot_hit'],
    })

    const logs = await logger.getLogs!()
    expect(logs.length).toBe(2)
    expect(logs[0].score).toBe(10)
    expect(logs[1].score).toBe(80)
    fs.rmSync(path.dirname(logPath), { recursive: true, force: true })
  })

  it('should handle many entries', async () => {
    const logPath = tmpLogFile()
    const logger = createJsonlLogger({ filePath: logPath, maxSizeBytes: 10_000_000 })
    for (let i = 0; i < 100; i++) {
      await logger.log({
        timestamp: new Date().toISOString(), ip: `10.0.0.${i % 10}`, path: '/',
        userAgent: 'Bot', score: i, action: 'allow', signals: [],
      })
    }

    const logs = await logger.getLogs!()
    expect(logs.length).toBe(100)
    fs.rmSync(path.dirname(logPath), { recursive: true, force: true })
  })

  it('should handle missing getLogs gracefully', async () => {
    const logPath = tmpLogFile()
    const logger = new JsonlLogger({ filePath: logPath, maxSizeBytes: 10_000_000 })
    expect(logger.getLogs).toBeDefined()
    fs.rmSync(path.dirname(logPath), { recursive: true, force: true })
  })
})

describe('ConsoleLogger', () => {
  it('should create logger with default options', () => {
    const logger = createConsoleLogger()
    expect(logger).toBeDefined()
    expect(typeof logger.log).toBe('function')
  })

  it('should log without throwing', async () => {
    const logger = createConsoleLogger({ colors: false, verbose: false })
    await expect(logger.log({
      timestamp: '2026-01-01T00:00:00Z', ip: '10.0.0.1', path: '/',
      userAgent: 'Test', score: 50, action: 'allow', signals: [],
    })).resolves.toBeUndefined()
  })

  it('should log with verbose output', async () => {
    const logger = createConsoleLogger({ colors: true, verbose: true })
    await expect(logger.log({
      timestamp: '2026-01-01T00:00:00Z', ip: '10.0.0.1', path: '/test',
      userAgent: 'TestBot', score: 90, action: 'block', signals: ['honeypot_hit'],
      method: 'GET', referer: 'https://example.com', responseTime: 42,
    })).resolves.toBeUndefined()
  })
})
