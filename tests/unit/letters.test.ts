import { describe, expect, it } from 'vitest'
import { letters } from '../../src/data/letters'
import { expandVariants, formatGlyph } from '../../src/domain/questionEngine'

describe('Arabic letter bank and joining forms', () => {
  it('contains the 28 unique core letters in Arabic alphabet order', () => {
    expect(letters.map((letter) => letter.glyph).join('')).toBe('ابتثجحخدذرزسشصضطظعغفقكلمنهوي')
    expect(letters).toHaveLength(28)
    expect(new Set(letters.map((letter) => letter.id)).size).toBe(28)
    expect(new Set(letters.map((letter) => letter.glyph)).size).toBe(28)
    expect(new Set(letters.map((letter) => letter.cue)).size).toBe(28)
  })

  it('marks only the six right-joining-only letters as right joining', () => {
    expect(letters.filter((letter) => letter.joining === 'right').map((letter) => letter.glyph)).toEqual([
      'ا',
      'د',
      'ذ',
      'ر',
      'ز',
      'و',
    ])
  })

  it('renders the requested isolated, initial, and final patterns', () => {
    const ain = letters.find((letter) => letter.id === 'ain')
    const alif = letters.find((letter) => letter.id === 'alif')

    expect(ain).toBeDefined()
    expect(alif).toBeDefined()
    expect(formatGlyph(ain!, 'isolated')).toBe('ع')
    expect(formatGlyph(ain!, 'initial')).toBe('عـ')
    expect(formatGlyph(ain!, 'final')).toBe('ـع')
    expect(() => formatGlyph(alif!, 'initial')).toThrow(/initial/i)
  })

  it('expands to exactly 78 unique valid variants', () => {
    const variants = expandVariants(letters)
    const counts = Object.groupBy(variants, (variant) => variant.mode)

    expect(variants).toHaveLength(78)
    expect(new Set(variants.map((variant) => variant.key)).size).toBe(78)
    expect(counts.isolated).toHaveLength(28)
    expect(counts.initial).toHaveLength(22)
    expect(counts.final).toHaveLength(28)
    expect(variants.filter((variant) => variant.mode === 'initial').every((variant) => {
      return letters.find((letter) => letter.id === variant.letterId)?.joining === 'dual'
    })).toBe(true)
  })
})
