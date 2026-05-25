import { describe, it, expect } from 'vitest'
import { generateAgentAccessPage, generateDeclarationApiResponse, generateAccessPolicyDeclaration } from '../src/core/portal'
import { DEFAULT_POLICY } from '../src/core/types'

describe('portal', () => {
  it('should generate access policy declaration comment', () => {
    const result = generateAccessPolicyDeclaration('Googlebot')
    expect(result).toContain('AgentGate Access Policy for Googlebot')
    expect(result).toContain('X-Agent-Declaration')
  })

  it('should generate agent access page with approved agents', () => {
    const policy = {
      ...DEFAULT_POLICY,
      approved_agents: [{ name: 'Googlebot', action: 'allow' as const }],
    }
    const page = generateAgentAccessPage(policy)
    expect(page).toContain('Agent Access Portal')
    expect(page).toContain('Googlebot')
    expect(page).toContain('X-Agent-Declaration')
  })

  it('should escape HTML in agent names (XSS prevention)', () => {
    const policy = {
      ...DEFAULT_POLICY,
      approved_agents: [
        { name: 'Googlebot<script>alert(1)</script>', action: 'allow' as const },
      ],
    }
    const page = generateAgentAccessPage(policy)
    expect(page).not.toContain('<script>alert(1)</script>')
    expect(page).toContain('&lt;script&gt;alert(1)')
  })

  it('should handle no approved agents', () => {
    const page = generateAgentAccessPage(DEFAULT_POLICY)
    expect(page).toContain('None configured')
  })

  it('should generate declaration API response', () => {
    const result = generateDeclarationApiResponse({
      agentName: 'MyBot',
      provider: 'openai',
      purpose: 'research',
      owner: 'ACME Corp',
      respectsRobotsTxt: true,
      declaredAt: new Date().toISOString(),
      mission: 'Testing AgentGate',
    })

    expect(result.status).toBe('registered')
    expect(result.agentId).toMatch(/^ag-/)
    expect(result.rateLimit).toBe(60)
    expect(result.allowedPaths).toContain('/public/*')
  })
})
