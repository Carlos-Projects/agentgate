#!/usr/bin/env node
/**
 * AgentGate Standalone Server
 */

const port = process.env.PORT || '3000'
console.log(`AgentGate server starting on port ${port}...`)
console.log('Configure with Next.js or Express middleware.')
const server = require('http').createServer((req: any, res: any) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('AgentGate server is running. Configure with Next.js or Express middleware.')
})
server.listen(port)
