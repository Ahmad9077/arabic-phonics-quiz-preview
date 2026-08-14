import type { RandomSource } from './types'

export function hashSeed(seedText: string): number {
  let seed = 2166136261

  for (let index = 0; index < seedText.length; index += 1) {
    seed ^= seedText.charCodeAt(index)
    seed = Math.imul(seed, 16777619)
  }

  return seed >>> 0
}

export function createSeededRandom(seedText: string): RandomSource {
  let seed = hashSeed(seedText)

  return () => {
    seed += 0x6d2b79f5
    let value = seed
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(items: readonly T[], random: RandomSource = Math.random): T[] {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    const currentValue = shuffled[index]
    const targetValue = shuffled[target]

    if (currentValue === undefined || targetValue === undefined) {
      continue
    }

    shuffled[index] = targetValue
    shuffled[target] = currentValue
  }

  return shuffled
}
