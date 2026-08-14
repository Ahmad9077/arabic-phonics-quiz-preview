import rawLetters from './letters.json'
import type { ArabicLetter, JoiningType } from '../domain/types'

interface RawLetter {
  id: string
  glyph: string
  nameAr: string
  cue: string
  joining: string
  family: string
}

function isJoiningType(value: string): value is JoiningType {
  return value === 'dual' || value === 'right'
}

export const letters: readonly ArabicLetter[] = (rawLetters as RawLetter[]).map((letter) => {
  if (!isJoiningType(letter.joining)) {
    throw new Error(`Invalid joining type for ${letter.id}.`)
  }

  return Object.freeze({
    ...letter,
    joining: letter.joining,
    audioFile: `audio/${letter.id}.mp3`,
  })
})

export const letterById = new Map(letters.map((letter) => [letter.id, letter]))
