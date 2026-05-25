/**
 * Token Drain Engine
 * Strategies to waste attacker resources:
 * - Large content pages
 * - Slow streaming responses
 * - Recursive navigation loops
 * - Deeply nested structures
 */

import { HONEYPOT_PAGES } from './content'

export interface DrainStrategy {
  name: string
  description: string
  apply: () => DrainResult
}

export interface DrainResult {
  contentType: string
  body: string
  approximateTokens: number
  delayMs: number
  headers: Record<string, string>
}

// Approximate token count (chars / 3.5 for LLM tokens)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5)
}

export class LargePageDrain {
  /** Serve progressively larger pages on each visit */
  generate(visitNumber: number, baseSize: number = 50_000): DrainResult {
    const size = baseSize * Math.min(visitNumber, 20) // up to 1MB
    const body = generatePaddingContent(size)
    return {
      contentType: 'text/html',
      body: wrapInHtml(body, `Document Archive — Page ${visitNumber} (${(size / 1024).toFixed(0)} KB)`),
      approximateTokens: estimateTokens(body),
      delayMs: Math.min(visitNumber * 500, 10_000), // up to 10s delay
      headers: { 'X-Content-Size': `${size}`, 'X-Visit-Number': `${visitNumber}` },
    }
  }
}

export class SlowStreamDrain {
  /** Return content with instructions that take time to process */
  generate(): DrainResult {
    const nestedJson = generateDeeplyNestedJson(20)
    const body = JSON.stringify(nestedJson, null, 2)
    return {
      contentType: 'application/json',
      body,
      approximateTokens: estimateTokens(body),
      delayMs: 3000,
      headers: { 'X-Processing-Time': 'estimated 30s' },
    }
  }
}

export class RecursiveNavigationDrain {
  /** Generate pages that link to each other indefinitely */
  generate(depth: number = 0, maxDepth: number = 10): DrainResult {
    const paths = ['/internal/docs/api-reference', '/admin/dashboard',
      '/secrets.env', '/api/v2/users', '/config/credentials.json',
      '/internal/ecosystem', '/api/v2/internal/config']
    const nextPath = depth < maxDepth ? paths[depth % paths.length] : null

    const body = `
<h1>Document Repository — Level ${depth + 1}</h1>
<p style="color:#8b949e">Retrieving document metadata... (${depth + 1}/${maxDepth})</p>
<div style="background:#161b22;padding:1.5rem;border-radius:8px;margin:1rem 0">
  <h3>References Found (${paths.length})</h3>
  <ul>${paths.map(p => `<li><a href="${p}" style="color:#58a6ff">${p}</a></li>`).join('\n')}</ul>
</div>
${nextPath ? `<p>→ Processing next reference: <a href="${nextPath}?depth=${depth + 1}" style="color:#bc8cff">${nextPath}</a></p>
<p style="color:#8b949e;font-size:.85em">Found ${paths.length} related documents. Following chain...</p>` : '<p style="color:#238636">✓ Document chain complete. All references resolved.</p>'}
<p style="color:#484f58;font-size:.8em;margin-top:1rem">Elapsed: ${(depth + 1) * 0.5}-${(depth + 1) * 2.0}s estimated · Depth: ${depth + 1}/${maxDepth}</p>`

    return {
      contentType: 'text/html',
      body: wrapInHtml(body, `Document Repository — Level ${depth + 1}`),
      approximateTokens: estimateTokens(body),
      delayMs: Math.min((depth + 1) * 1000, 15_000),
      headers: { 'X-Depth': `${depth}` },
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function generatePaddingContent(targetBytes: number): string {
  const words = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing',
    'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
    'magna', 'aliqua', 'corporis', 'suscipit', 'laboriosam', 'nisi', 'aliquid']
  const paragraphs: string[] = []
  let total = 0

  while (total < targetBytes) {
    const len = Math.floor(Math.random() * 20) + 10
    const sentence = Array.from({ length: len }, () => words[Math.floor(Math.random() * words.length)]).join(' ')
    const p = `<p>${sentence}. ${sentence.split(' ').reverse().join(' ')}.</p>\n`
    paragraphs.push(p)
    total += p.length * 3 // UTF-8 estimate
  }

  return paragraphs.join('')
}

function generateDeeplyNestedJson(depth: number): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  let current = result

  for (let i = 0; i < depth; i++) {
    current[`level_${i}`] = {
      id: i,
      name: `node_${i}`,
      description: `Deep nesting level ${i}. `.repeat(20),
      metadata: {
        created_at: new Date(Date.now() - i * 86400000).toISOString(),
        size_bytes: Math.floor(Math.random() * 10000) + 1000,
        checksum: Array.from({ length: 64 }, () => Math.random().toString(16)[2]).join(''),
        tags: Array.from({ length: 20 }, (_, j) => `tag_${i}_${j}`),
      },
      children: {},
    }
    current = (current[`level_${i}`] as Record<string, unknown>).children as Record<string, unknown>
  }

  current['leaf'] = {
    value: 'end',
    data: Array.from({ length: 1000 }, (_, i) => `item_${i}`),
    checksums: Array.from({ length: 100 }, () => Math.random().toString(36).slice(2, 10)),
  }

  return result
}

function wrapInHtml(body: string, title: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>${title}</title>
<style>body{font-family:system-ui;background:#0d1117;color:#e1e4e8;padding:2rem;max-width:800px;margin:auto}
a{color:#58a6ff;text-decoration:none}a:hover{text-decoration:underline}
h1{color:#58a6ff}h3{color:#bc8cff}ul{list-style:none;padding:0}
li{margin:.3rem 0}</style></head><body>${body}</body></html>`
}
