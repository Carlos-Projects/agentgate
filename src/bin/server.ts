#!/usr/bin/env node
/**
 * AgentGate Standalone Server
 *
 * WARNING: This server is a stub and provides NO security enforcement.
 * Integrate agentgate as Express/Next.js middleware instead.
 */

console.error('')
console.error('  ⚠️  WARNING: agentgate-server is a stub. It provides NO security enforcement.')
console.error('  ⚠️  Integrate agentgate as middleware in your existing app:')
console.error('  ⚠️    const { AgentGate } = require("agentgate")')
console.error('  ⚠️    const gate = new AgentGate({ policy: myPolicy })')
console.error('  ⚠️    app.use((req, res, next) => gate.processRequest(adapterRequest))')
console.error('')

throw new Error(
  'agentgate-server is a stub. It provides NO security enforcement. ' +
  'Integrate agentgate as middleware in your existing application instead.'
)
