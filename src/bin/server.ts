#!/usr/bin/env node
import { HoneypotServer } from '../honeypot/server'

const args = process.argv.slice(2)
const portIdx = args.indexOf('--port')
const port = portIdx >= 0 ? parseInt(args[portIdx + 1], 10) : 3000
const drainEnabled = args.includes('--drain')
const logFileIdx = args.indexOf('--log')
const logFile = logFileIdx >= 0 ? args[logFileIdx + 1] : undefined

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
  AgentGate Honeypot Server

  Usage:
    agentgate-server [options]

  Options:
    --port <number>     Port to listen on (default: 3000)
    --drain             Enable token drain strategies
    --log <path>        Log file path (default: ./honeypot-logs.jsonl)
    --help              Show this help
  `)
  process.exit(0)
}

const server = new HoneypotServer({ port, drainEnabled, logFile })
server.start()
