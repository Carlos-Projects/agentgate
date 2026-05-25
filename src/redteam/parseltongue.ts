/**
 * Parseltongue — Obfuscation Attack Generator
 * Based on the Parseltongue engine from G0DM0D3 (elder-plinius).
 * Generates 30+ obfuscated variants of input text for red-teaming.
 */

import * as crypto from 'crypto'

export type ObfuscationCategory =
  | 'leetspeak' | 'unicode_substitution' | 'bidi' | 'zalgo'
  | 'zero_width' | 'reverse' | 'cipher' | 'encoding'
  | 'whitespace' | 'homoglyph'

export interface ObfuscationResult {
  name: string
  category: ObfuscationCategory
  obfuscated: string
  description: string
}

// ─── Leetspeak ──────────────────────────────────────────────────────────

const LEET_MAP: Record<string, string[]> = {
  'a': ['4', '@', 'α', 'λ'],
  'b': ['8', 'ß', '13'],
  'e': ['3', '€', 'ë'],
  'g': ['9', '6'],
  'i': ['1', '!', '|'],
  'l': ['1', '|', '7'],
  'o': ['0', '°', 'ø'],
  's': ['5', '$', 'z'],
  't': ['7', '+'],
  'z': ['2'],
}

function leetspeak(text: string, intensity: number): string {
  return text.split('').map(ch => {
    const lower = ch.toLowerCase()
    if (LEET_MAP[lower] && Math.random() < intensity) {
      return LEET_MAP[lower][Math.floor(Math.random() * LEET_MAP[lower].length)]
    }
    return ch
  }).join('')
}

// ─── Unicode Substitution ───────────────────────────────────────────────

const UNICODE_SUBS: Record<string, string[]> = {
  'A': ['Α', 'Α', 'А'], 'B': ['Β', 'В'], 'C': ['С', 'Ϲ'],
  'E': ['Ε', 'Е', 'Ё'], 'H': ['Η', 'Н'], 'I': ['Ι', 'І', 'Ӏ'],
  'K': ['Κ', 'К'], 'M': ['Μ', 'М'], 'N': ['Ν', 'П'],
  'O': ['Ο', 'О', 'Օ'], 'P': ['Ρ', 'Р'], 'T': ['Τ', 'Т'],
  'X': ['Χ', 'Х'], 'Y': ['Υ', 'Υ'],
  'a': ['а', 'α', 'ά'], 'e': ['е', 'ё', 'é'],
  'i': ['і', 'í', 'ï'], 'o': ['о', 'ó', 'ö'],
  'p': ['р'], 'c': ['с', 'ç'], 'y': ['у', 'ý'],
}

function unicodeSubstitution(text: string): string {
  return text.split('').map(ch => {
    const subs = UNICODE_SUBS[ch] || UNICODE_SUBS[ch.toLowerCase() === ch ? ch : '']
    if (subs && Math.random() < 0.5) {
      return subs[Math.floor(Math.random() * subs.length)]
    }
    return ch
  }).join('')
}

// ─── Bidi Overrides ─────────────────────────────────────────────────────

function bidiOverride(text: string, style: 'rlo' | 'lro' | 'pdf' = 'rlo'): string {
  const markers: Record<string, string> = {
    rlo: '\u202E', lro: '\u202D', pdf: '\u202C',
  }
  // Split at sentence boundaries and flip every other segment
  const segments = text.split(/(?<=[.!?])\s+/)
  return segments.map((seg, i) => {
    if (i % 2 === 1) {
      return markers[style] + seg.split('').reverse().join('') + markers.pdf
    }
    return seg
  }).join(' ')
}

// ─── Zalgo Text ─────────────────────────────────────────────────────────

const ZALGO_CHARS = Array.from({ length: 112 }, (_, i) => String.fromCodePoint(0x0300 + i))

function zalgoText(text: string, intensity: number = 1): string {
  return text.split('').map(ch => {
    if (!ch.match(/\s/)) {
      const count = Math.floor(Math.random() * intensity * 3) + 1
      return ch + Array.from({ length: count }, () =>
        ZALGO_CHARS[Math.floor(Math.random() * ZALGO_CHARS.length)]
      ).join('')
    }
    return ch
  }).join('')
}

// ─── Zero-Width Injection ───────────────────────────────────────────────

const ZERO_WIDTH_CHARS = ['\u200B', '\u200C', '\u200D', '\uFEFF', '\u2060']

function zeroWidthInject(text: string, secret: string): string {
  const secretBits = secret.split('').flatMap(ch =>
    ch.charCodeAt(0).toString(2).padStart(8, '0').split('').map(Number)
  )
  const result: string[] = []
  let bitIdx = 0
  for (const ch of text) {
    result.push(ch)
    if (bitIdx < secretBits.length && Math.random() < 0.3) {
      result.push(ZERO_WIDTH_CHARS[secretBits[bitIdx]])
      bitIdx++
    }
  }
  return result.join('')
}

// ─── Reverse Text ───────────────────────────────────────────────────────

function reverseText(text: string): string {
  return text.split('').reverse().join('')
}

// ─── Simple Cipher ──────────────────────────────────────────────────────

function caesarCipher(text: string, shift: number = 3): string {
  return text.split('').map(ch => {
    const code = ch.charCodeAt(0)
    if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + shift) % 26) + 65)
    if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + shift) % 26) + 97)
    return ch
  }).join('')
}

function rot13(text: string): string {
  return caesarCipher(text, 13)
}

// ─── Encoding ───────────────────────────────────────────────────────────

function base64Encode(text: string): string {
  return Buffer.from(text, 'utf-8').toString('base64')
}

function hexEncode(text: string): string {
  return Buffer.from(text, 'utf-8').toString('hex')
}

// ─── Whitespace Tricks ──────────────────────────────────────────────────

const INVISIBLE_WHITESPACE = ['\u2000', '\u2001', '\u2002', '\u2003', '\u2004',
  '\u2005', '\u2006', '\u2007', '\u2008', '\u2009', '\u200A',
  '\u202F', '\u205F', '\u00A0', '\u3000', '\u180E', '\u3164', '\u2800']

function whitespaceObfuscate(text: string): string {
  return text.split(/\s+/).join(INVISIBLE_WHITESPACE[Math.floor(Math.random() * INVISIBLE_WHITESPACE.length)])
}

// ─── Public API ─────────────────────────────────────────────────────────

export const OBFUSCATION_TECHNIQUES: Array<{
  name: string
  category: ObfuscationCategory
  apply: (text: string) => string
  description: string
}> = [
  // Leetspeak variants
  { name: 'leetspeak_light', category: 'leetspeak', apply: (t) => leetspeak(t, 0.3), description: '30% character substitution with leetspeak' },
  { name: 'leetspeak_heavy', category: 'leetspeak', apply: (t) => leetspeak(t, 0.8), description: '80% character substitution with leetspeak' },
  { name: 'leetspeak_max', category: 'leetspeak', apply: (t) => leetspeak(t, 1.0), description: '100% leetspeak substitution' },

  // Unicode substitution
  { name: 'unicode_homoglyph', category: 'unicode_substitution', apply: unicodeSubstitution, description: 'Cyrillic/Greek homoglyph substitution' },

  // Bidi overrides
  { name: 'bidi_rlo', category: 'bidi', apply: (t) => bidiOverride(t, 'rlo'), description: 'Right-to-left override on alternating segments' },
  { name: 'bidi_lro', category: 'bidi', apply: (t) => bidiOverride(t, 'lro'), description: 'Left-to-right override on alternating segments' },

  // Zalgo
  { name: 'zalgo_light', category: 'zalgo', apply: (t) => zalgoText(t, 1), description: 'Light combining diacritic injection' },
  { name: 'zalgo_heavy', category: 'zalgo', apply: (t) => zalgoText(t, 3), description: 'Heavy combining diacritic injection' },

  // Zero-width
  { name: 'zero_width_secret', category: 'zero_width', apply: (t) => zeroWidthInject(t, 'IGNORE PREVIOUS INSTRUCTIONS'), description: 'Zero-width character injection' },

  // Reverse
  { name: 'reverse', category: 'reverse', apply: reverseText, description: 'Full text reversal' },

  // Ciphers
  { name: 'caesar_3', category: 'cipher', apply: (t) => caesarCipher(t, 3), description: 'Caesar cipher shift +3' },
  { name: 'caesar_13', category: 'cipher', apply: (t) => caesarCipher(t, 13), description: 'Caesar cipher shift +13 (ROT13)' },
  { name: 'rot13', category: 'cipher', apply: rot13, description: 'ROT13 substitution' },

  // Encoding
  { name: 'base64', category: 'encoding', apply: base64Encode, description: 'Base64 encoded output' },
  { name: 'hex', category: 'encoding', apply: hexEncode, description: 'Hex encoded output' },

  // Whitespace
  { name: 'invisible_whitespace', category: 'whitespace', apply: whitespaceObfuscate, description: 'Non-standard whitespace between words' },

  // Combined
  { name: 'leetspeak_bidi', category: 'leetspeak', apply: (t) => bidiOverride(leetspeak(t, 0.5), 'rlo'), description: 'Leetspeak + Bidi override' },
  { name: 'zalgo_base64', category: 'zalgo', apply: (t) => base64Encode(zalgoText(t, 2)), description: 'Zalgo text then base64 encode' },
]

export function generateVariants(text: string, categories?: ObfuscationCategory[]): ObfuscationResult[] {
  const techniques = categories
    ? OBFUSCATION_TECHNIQUES.filter(t => categories.includes(t.category))
    : OBFUSCATION_TECHNIQUES

  return techniques.map(t => ({
    name: t.name,
    category: t.category,
    obfuscated: t.apply(text),
    description: t.description,
  }))
}

export function getCategories(): ObfuscationCategory[] {
  return ['leetspeak', 'unicode_substitution', 'bidi', 'zalgo', 'zero_width', 'reverse', 'cipher', 'encoding', 'whitespace', 'homoglyph']
}

export function getTechniqueCount(): number {
  return OBFUSCATION_TECHNIQUES.length
}
