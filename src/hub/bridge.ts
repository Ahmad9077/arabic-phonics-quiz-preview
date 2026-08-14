import { QUIZ_ID } from '../domain/questionEngine'
import type { Attempt, Difficulty, HubResult } from '../domain/types'
import type { BuildMode, ChallengeState, HubWindow } from './contracts'

export type ReportPath = 'none' | 'adaptive' | 'progress'

export class HubBridge {
  private readonly submittedTurns = new Set<string>()
  private readonly pendingTurns = new Set<string>()

  constructor(
    private readonly mode: BuildMode,
    private readonly target: HubWindow = window as unknown as HubWindow,
  ) {}

  async reportRound(attempts: readonly Attempt[], difficulty: Difficulty): Promise<ReportPath> {
    if (this.mode !== 'production-hub' || attempts.length === 0) return 'none'

    const adaptive = this.target.QuizzesHubAdaptive?.recordAttempt
    if (adaptive) {
      try {
        const result = await adaptive.call(
          this.target.QuizzesHubAdaptive,
          attempts.map((attempt) => ({
            question: { key: attempt.questionKey },
            correct: attempt.correct,
          })),
        )
        if (result?.ok) return 'adaptive'
      } catch {
        // Fall through to the established aggregate progress path.
      }
    }

    const record = this.target.QuizzesHubProgress?.record
    if (!record) return 'none'

    try {
      const score = attempts.filter((attempt) => attempt.correct).length
      const result = await record.call(this.target.QuizzesHubProgress, {
        quizId: QUIZ_ID,
        score,
        total: attempts.length,
        level: score === attempts.length ? 'A+' : score >= attempts.length * 0.8 ? 'A' : 'Practice',
        details: {
          difficulty,
          questionKeys: attempts.map((attempt) => attempt.questionKey),
        },
      })
      return result?.ok ? 'progress' : 'none'
    } catch {
      return 'none'
    }
  }

  async submitChallenge(attempt: Attempt, turnId: string): Promise<HubResult> {
    if (this.mode !== 'production-hub') return { ok: false, reason: 'preview-mode' }
    if (this.submittedTurns.has(turnId) || this.pendingTurns.has(turnId)) {
      return { ok: false, reason: 'duplicate-turn' }
    }

    const client = this.target.QuizzesHubChallenge
    if (!client?.active || !client.canAnswer()) return { ok: false, reason: 'not-your-turn' }

    this.pendingTurns.add(turnId)
    try {
      const result = await client.submitAnswer({
        answerText: attempt.selectedGlyph,
        isCorrect: attempt.correct,
      })
      if (result?.ok) this.submittedTurns.add(turnId)
      return result ?? { ok: false, reason: 'empty-response' }
    } catch {
      return { ok: false, reason: 'submit-failed' }
    } finally {
      this.pendingTurns.delete(turnId)
    }
  }

  onChallengeChange(listener: (state: ChallengeState) => void): () => void {
    return this.target.QuizzesHubChallenge?.onChange(listener) ?? (() => undefined)
  }

  canAnswerChallenge(): boolean {
    return this.target.QuizzesHubChallenge?.canAnswer() ?? false
  }

  openHub(): void {
    this.target.QuizzesHubChallenge?.openHub()
  }
}
