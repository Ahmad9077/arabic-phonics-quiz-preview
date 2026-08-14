import { letterById, letters } from '../data/letters'
import { createSeededRandom, shuffle } from './seededRandom'
import type {
  ArabicLetter,
  Difficulty,
  DisplayMode,
  QuestionChoice,
  QuestionVariant,
  QuizQuestion,
  QuizRound,
  QuizSource,
  RandomSource,
} from './types'

export const QUIZ_ID = 'arabic-phonics'
export const QUESTIONS_PER_ROUND = 15
export const DISPLAY_MODES: readonly DisplayMode[] = ['isolated', 'initial', 'final']

const TATWEEL = 'ـ'

export function formatGlyph(letter: ArabicLetter, mode: DisplayMode): string {
  if (mode === 'initial') {
    if (letter.joining !== 'dual') {
      throw new Error(`${letter.id} cannot be rendered as an initial joining form.`)
    }

    return `${letter.glyph}${TATWEEL}`
  }

  if (mode === 'final') {
    return `${TATWEEL}${letter.glyph}`
  }

  return letter.glyph
}

export function expandVariants(letterBank: readonly ArabicLetter[] = letters): QuestionVariant[] {
  return letterBank.flatMap((letter) => {
    const modes: DisplayMode[] = letter.joining === 'dual'
      ? ['isolated', 'initial', 'final']
      : ['isolated', 'final']

    return modes.map((mode) => ({
      key: `${letter.id}:${mode}`,
      letterId: letter.id,
      mode,
      glyph: formatGlyph(letter, mode),
      audioFile: letter.audioFile,
    }))
  })
}

export const allVariants = expandVariants()
export const variantByKey = new Map(allVariants.map((variant) => [variant.key, variant]))

function eligibleLetters(mode: DisplayMode): ArabicLetter[] {
  return letters.filter((letter) => mode !== 'initial' || letter.joining === 'dual')
}

function asChoice(letter: ArabicLetter, mode: DisplayMode): QuestionChoice {
  return {
    letterId: letter.id,
    glyph: formatGlyph(letter, mode),
    nameAr: letter.nameAr,
  }
}

function takeUnique(
  source: readonly ArabicLetter[],
  count: number,
  used: Set<string>,
  random: RandomSource,
): ArabicLetter[] {
  if (count <= 0) return []

  const selected: ArabicLetter[] = []

  for (const candidate of shuffle(source, random)) {
    if (used.has(candidate.id)) continue
    selected.push(candidate)
    used.add(candidate.id)
    if (selected.length >= count) break
  }

  return selected
}

export function buildChoicesForVariant(
  variant: QuestionVariant,
  difficulty: Difficulty,
  random: RandomSource = Math.random,
): QuestionChoice[] {
  const target = letterById.get(variant.letterId)

  if (!target) {
    throw new Error(`Unknown target letter ${variant.letterId}.`)
  }

  const candidates = eligibleLetters(variant.mode).filter((letter) => letter.id !== target.id)
  const sameFamily = candidates.filter((letter) => letter.family === target.family)
  const otherFamilies = candidates.filter((letter) => letter.family !== target.family)
  const desiredSameFamily = difficulty === 'hard' ? 3 : difficulty === 'medium' ? 1 : 0
  const used = new Set<string>([target.id])
  const distractors = takeUnique(sameFamily, desiredSameFamily, used, random)

  distractors.push(...takeUnique(otherFamilies, 3 - distractors.length, used, random))

  if (distractors.length < 3) {
    distractors.push(...takeUnique(candidates, 3 - distractors.length, used, random))
  }

  if (distractors.length !== 3) {
    throw new Error(`Could not build three choices for ${variant.key}.`)
  }

  return shuffle([target, ...distractors], random).map((letter) => asChoice(letter, variant.mode))
}

function sanitizePreferredVariants(preferredKeys: readonly string[]): QuestionVariant[] {
  const quotas = new Map<DisplayMode, number>(DISPLAY_MODES.map((mode) => [mode, 0]))
  const usedLetters = new Set<string>()
  const usedKeys = new Set<string>()
  const accepted: QuestionVariant[] = []

  for (const key of preferredKeys) {
    const variant = variantByKey.get(key)
    if (!variant || usedKeys.has(key) || usedLetters.has(variant.letterId)) continue
    if ((quotas.get(variant.mode) ?? 0) >= 5) continue

    accepted.push(variant)
    usedKeys.add(key)
    usedLetters.add(variant.letterId)
    quotas.set(variant.mode, (quotas.get(variant.mode) ?? 0) + 1)
  }

  return accepted
}

export function buildRound(
  difficulty: Difficulty,
  preferredKeys: readonly string[] = [],
  random: RandomSource = Math.random,
  source: QuizSource = 'preview',
): QuizRound {
  const selected = sanitizePreferredVariants(preferredKeys)
  const usedLetters = new Set(selected.map((variant) => variant.letterId))
  const modesByConstraint: readonly DisplayMode[] = ['initial', 'isolated', 'final']

  for (const mode of modesByConstraint) {
    const currentCount = selected.filter((variant) => variant.mode === mode).length
    const required = 5 - currentCount
    const candidates = allVariants.filter((variant) => {
      return variant.mode === mode && !usedLetters.has(variant.letterId)
    })

    const additions = shuffle(candidates, random).slice(0, required)
    if (additions.length !== required) {
      throw new Error(`Could not satisfy the ${mode} round quota.`)
    }

    selected.push(...additions)
    additions.forEach((variant) => usedLetters.add(variant.letterId))
  }

  const questions = shuffle(selected, random).map<QuizQuestion>((variant) => ({
    variant,
    choices: buildChoicesForVariant(variant, difficulty, random),
    difficulty,
  }))

  if (questions.length !== QUESTIONS_PER_ROUND) {
    throw new Error(`Expected ${QUESTIONS_PER_ROUND} questions, received ${questions.length}.`)
  }

  return { questions, difficulty, source }
}

export function buildChallengeQuestion(
  questionKey: string,
  turnIndex: number,
  difficulty: Difficulty = 'medium',
): QuizQuestion | null {
  const variant = variantByKey.get(questionKey)
  if (!variant) return null

  const random = createSeededRandom(`${QUIZ_ID}:${questionKey}:${turnIndex}`)
  return {
    variant,
    choices: buildChoicesForVariant(variant, difficulty, random),
    difficulty,
  }
}
