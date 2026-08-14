import type { HubAttemptItem, HubResult } from '../domain/types'

export type BuildMode = 'preview' | 'production-hub'

export interface HubAccess {
  ok?: boolean
  quizId?: string
  difficulty?: string
  reason?: string
}
export interface HubAdaptivePlan {
  question_keys?: string[]
}

export interface HubProgressPayload {
  quizId: string
  score: number
  total: number
  level?: string
  details?: Record<string, unknown>
}

export interface ChallengePlayer {
  user_id: string
  display_name: string
  wrong_count: number
}

export interface ChallengeTurn {
  turn_index?: number
  question_key?: string
  answer_text?: string
  is_correct?: boolean
  answered_by_user_id?: string
}

export interface ChallengeState {
  status: 'waiting' | 'active' | 'finished' | string
  current_answering_user_id: string | null
  current_question_key: string | null
  current_turn_index: number
  last_turn: ChallengeTurn | null
  players: ChallengePlayer[]
  winner_id: string | null
}

export interface HubChallengeClient {
  active: boolean
  currentUserId: string | null
  canAnswer(): boolean
  onChange(listener: (state: ChallengeState) => void): () => void
  openHub(): void
  submitAnswer(answer: { answerText: string; isCorrect: boolean }): Promise<HubResult>
}

export interface HubWindow {
  QUIZZES_HUB_CONFIG?: Record<string, unknown>
  QuizzesHubAccessReady?: Promise<HubAccess>
  QuizzesHubAdaptiveReady?: Promise<HubAdaptivePlan | undefined>
  QuizzesHubChallengeReady?: Promise<ChallengeState>
  QuizzesHubAdaptive?: {
    recordAttempt(attempts: HubAttemptItem[]): Promise<HubResult | undefined> | undefined
  }
  QuizzesHubProgress?: {
    record(payload: HubProgressPayload): Promise<HubResult | undefined> | undefined
  }
  QuizzesHubChallenge?: HubChallengeClient
}
