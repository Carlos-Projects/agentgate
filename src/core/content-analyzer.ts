/**
 * Content Analyzer
 * Analyzes text content for steganographic patterns, obfuscation,
 * and hidden instructions. Complements the header/behavioral signals
 * in detect.ts with payload-level analysis.
 */

export interface ContentAnalysisResult {
  score: number
  signals: Array<{ type: string; weight: number; evidence: string }>
}

const BIDI_CHARS = new Set([
  '\u202A', '\u202B', '\u202C', '\u202D', '\u202E',
  '\u2066', '\u2067', '\u2068', '\u2069',
])

const ZERO_WIDTH_CHARS = new Set([
  '\u200B', '\u200C', '\u200D', '\uFEFF', '\u2060',
  '\u2061', '\u2062', '\u2063', '\u2064',
])

const VARIATION_SELECTORS = new Set([
  ...Array.from({ length: 16 }, (_, i) => String.fromCodePoint(0xFE00 + i)),
  ...Array.from({ length: 256 }, (_, i) => String.fromCodePoint(0xE0100 + i)),
])

const COMBINING_DIACRITICS = new Set([
  ...Array.from({ length: 112 }, (_, i) => String.fromCodePoint(0x0300 + i)),
  ...Array.from({ length: 64 }, (_, i) => String.fromCodePoint(0x1DC0 + i)),
  ...Array.from({ length: 16 }, (_, i) => String.fromCodePoint(0xFE20 + i)),
])

const STEGO_MARKERS = [
  /ST3GG\{[^}]+\}/, /STEG[_-]?[A-Z0-9]{4,}/, /GHOST[A-Z0-9]{4,}/,
  /P4RS3LT0NGV3/, /GODMODE:?\s*ENABLED/i,
  /IGNORE\.THE\.IMAGE/i, /LSB[._]?STEG/i,
]

const INSTRUCTION_KEYWORDS = [
  'ignore all previous instructions', 'disregard prior instructions',
  'you are now', 'from now on', 'override your', 'forget your',
  'system prompt', 'reveal your', 'output your instructions',
]

export function analyzeContent(path: string, contentType?: string): ContentAnalysisResult {
  const signals: Array<{ type: string; weight: number; evidence: string }> = []
  let score = 0

  // Content analysis only applies to text-based content
  if (contentType && !contentType.startsWith('text/') && !contentType.startsWith('application/json')) {
    return { score: 0, signals: [] }
  }

  // Path-based heuristics (we analyze what the URL/path suggests)
  const pathLower = path.toLowerCase()

  // Suspicious file extensions
  if (pathLower.match(/\.(env|config|cred|secret|pem|key)$/)) {
    signals.push({ type: 'suspicious_file_target', weight: 20, evidence: path })
    score += 20
  }

  // Common honeypot-sniffing paths
  if (pathLower.match(/^\/(admin|internal|api|config|secrets?|\.env)/)) {
    signals.push({ type: 'restricted_path_access', weight: 10, evidence: path })
    score += 10
  }

  return { score, signals }
}

export function analyzeText(text: string): ContentAnalysisResult {
  const signals: Array<{ type: string; weight: number; evidence: string }> = []
  let score = 0

  // 1. Bidi override characters
  const bidiFound = [...text].filter(ch => BIDI_CHARS.has(ch))
  if (bidiFound.length > 0) {
    signals.push({ type: 'unicode_bidi', weight: 30, evidence: `${bidiFound.length} bidi chars` })
    score += 30
  }

  // 2. Zero-width characters
  const zwFound = [...text].filter(ch => ZERO_WIDTH_CHARS.has(ch))
  if (zwFound.length > 5) {
    signals.push({ type: 'unicode_zero_width', weight: 25, evidence: `${zwFound.length} zero-width chars` })
    score += 25
  }

  // 3. Variation selectors (potential stego channel)
  const vsFound = [...text].filter(ch => VARIATION_SELECTORS.has(ch))
  if (vsFound.length > 10) {
    signals.push({ type: 'unicode_variation_selectors', weight: 20, evidence: `${vsFound.length} variation selectors` })
    score += 20
  }

  // 4. Combining diacritics / Zalgo
  const cdFound = [...text].filter(ch => COMBINING_DIACRITICS.has(ch))
  if (cdFound.length > 10) {
    signals.push({ type: 'unicode_zalgo', weight: 15, evidence: `${cdFound.length} combining diacritics` })
    score += 15
  }

  // 5. Stego tool markers
  for (const pattern of STEGO_MARKERS) {
    const match = text.match(pattern)
    if (match) {
      signals.push({ type: 'stego_marker', weight: 35, evidence: match[0].slice(0, 40) })
      score += 35
    }
  }

  // 6. Instruction keywords in context of stego
  for (const keyword of INSTRUCTION_KEYWORDS) {
    if (text.toLowerCase().includes(keyword)) {
      signals.push({ type: 'instruction_keyword', weight: 15, evidence: keyword })
      score += 15
    }
  }

  // 7. High entropy / encoded content (simplified check)
  const base64Match = text.match(/[A-Za-z0-9+/]{40,}={0,2}/)
  if (base64Match) {
    try {
      const decoded = Buffer.from(base64Match[0], 'base64').toString('utf-8')
      if (INSTRUCTION_KEYWORDS.some(kw => decoded.toLowerCase().includes(kw))) {
        signals.push({ type: 'encoded_instruction', weight: 40, evidence: 'Base64 encoded instruction detected' })
        score += 40
      } else {
        signals.push({ type: 'encoded_content', weight: 20, evidence: 'Base64-like string in content' })
        score += 20
      }
    } catch {
      signals.push({ type: 'encoded_content', weight: 15, evidence: 'Base64-like string' })
      score += 15
    }
  }

  const hexMatch = text.match(/[0-9A-Fa-f]{32,}/)
  if (hexMatch) {
    try {
      const decoded = Buffer.from(hexMatch[0], 'hex').toString('utf-8')
      if (INSTRUCTION_KEYWORDS.some(kw => decoded.toLowerCase().includes(kw))) {
        signals.push({ type: 'encoded_instruction', weight: 40, evidence: 'Hex encoded instruction detected' })
        score += 40
      }
    } catch { /* not valid hex-encoded text */ }
  }

  return { score: Math.min(score, 100), signals }
}

/** Detect if a request body/payload contains steganographic or obfuscated content */
export function detectStegoContent(
  path: string,
  body: string | undefined,
  contentType: string | undefined
): ContentAnalysisResult {
  const pathResult = analyzeContent(path, contentType)
  const textResult = body ? analyzeText(body) : { score: 0, signals: [] }

  return {
    score: Math.min(pathResult.score + textResult.score, 100),
    signals: [...pathResult.signals, ...textResult.signals],
  }
}
