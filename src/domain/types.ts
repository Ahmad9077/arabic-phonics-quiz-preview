export type Difficulty = 'easy' | 'medium' | 'hard'

export type DisplayMode = 'isolated' | 'initial' | 'final'

export type JoiningType = 'dual' | 'right'

export type QuizSource = 'preview' | 'hub' | 'challenge'

export interface ArabicLetter {
  id: string
  glyph: string
  nameAr: string
  cue: string
  joining: JoiningType
  family: string
  audioFile: string
}

export interface QuestionVariant {
  key: string
  letterId: string
  mode: DisplayMode
  glyph: string
  audioFile: string
}

export interface QuestionChoice {
  letterId: string
  glyph: string
  nameAr: string
}

export interface QuizQuestion {
  variant: QuestionVariant
  choices: QuestionChoice[]
  difficulty: Difficulty
}

export interface QuizRound {
  questions: QuizQuestion[]
  difficulty: Difficulty
  source: QuizSource
}

export interface Attempt {
  questionKey: string
  selectedLetterId: string
  selectedGlyph: string
  expectedLetterId: string
  expectedGlyph: string
  mode: DisplayMode
  correct: boolean
}

export interface AudioManifestEntry {
  letterId: string
  cue: string
  file: string
  durationMs: number
  bytes: number
  sha256: string
}

export interface AudioManifest {
  generatedAt: string
  generator: string
  entries: AudioManifestEntry[]
}

export interface HubAttemptItem {
  question: { key: string }
  correct: boolean
}

export interface HubResult {
  ok: boolean
  reason?: string
}

export type RandomSource = () => number
