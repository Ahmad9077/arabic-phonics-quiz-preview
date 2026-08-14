import { describe, expect, it } from 'vitest'
import { letters } from '../../src/data/letters'
import {
  buildChallengeQuestion,
  buildChoicesForVariant,
  buildRound,
  expandVariants,
} from '../../src/domain/questionEngine'
import { createSeededRandom } from '../../src/domain/seededRandom'

const letterById = new Map(letters.map((letter) => [letter.id, letter]))

describe('round generation', () => {
  it('preserves every round invariant across 1,000 deterministic samples', () => {
    for (let sample = 0; sample < 1_000; sample += 1) {
      const round = buildRound('medium', [], createSeededRandom(`sample-${sample}`))
      const counts = Object.groupBy(round.questions, (question) => question.variant.mode)
      const targetIds = round.questions.map((question) => question.variant.letterId)

      expect(round.questions).toHaveLength(15)
      expect(new Set(targetIds).size).toBe(15)
      expect(counts.isolated).toHaveLength(5)
      expect(counts.initial).toHaveLength(5)
      expect(counts.final).toHaveLength(5)

      for (const question of round.questions) {
        const choiceIds = question.choices.map((choice) => choice.letterId)
        expect(question.choices).toHaveLength(4)
        expect(new Set(choiceIds).size).toBe(4)
        expect(choiceIds.filter((id) => id === question.variant.letterId)).toHaveLength(1)
        expect(question.choices.every((choice) => {
          if (question.variant.mode !== 'initial') return true
          return letterById.get(choice.letterId)?.joining === 'dual'
        })).toBe(true)
      }
    }
  })

  it('sanitizes preferred keys without breaking quotas or distinct base letters', () => {
    const preferred = [
      'ain:initial',
      'ain:final',
      'alif:initial',
      'unknown:isolated',
      'beh:isolated',
      'jeem:final',
    ]
    const round = buildRound('easy', preferred, createSeededRandom('preferred'))
    const keys = round.questions.map((question) => question.variant.key)

    expect(keys).toContain('ain:initial')
    expect(keys).toContain('beh:isolated')
    expect(keys).toContain('jeem:final')
    expect(keys).not.toContain('ain:final')
    expect(keys).not.toContain('alif:initial')
    expect(keys).not.toContain('unknown:isolated')
  })

  it('uses closer visual families for hard choices than easy choices', () => {
    const variant = expandVariants(letters).find((candidate) => candidate.key === 'beh:initial')
    expect(variant).toBeDefined()

    const easy = buildChoicesForVariant(variant!, 'easy', createSeededRandom('same-seed'))
    const hard = buildChoicesForVariant(variant!, 'hard', createSeededRandom('same-seed'))
    const targetFamily = letterById.get('beh')?.family
    const countSameFamily = (ids: string[]) => ids.filter((id) => letterById.get(id)?.family === targetFamily).length

    expect(countSameFamily(hard.map((choice) => choice.letterId))).toBeGreaterThan(
      countSameFamily(easy.map((choice) => choice.letterId)),
    )
  })

  it('builds identical challenge choices from the same stable seed', () => {
    const first = buildChallengeQuestion('ain:final', 7)
    const second = buildChallengeQuestion('ain:final', 7)

    expect(first).toEqual(second)
    expect(first?.choices).toHaveLength(4)
  })
})
