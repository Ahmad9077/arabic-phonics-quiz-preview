import { describe, expect, it, vi } from 'vitest'
import { HubBridge } from '../../src/hub/bridge'
import { normalizeDifficulty } from '../../src/hub/bootstrap'
import type { HubWindow } from '../../src/hub/contracts'
import type { Attempt } from '../../src/domain/types'

const attempt: Attempt = {
  questionKey: 'ain:initial',
  selectedLetterId: 'ain',
  selectedGlyph: 'عـ',
  expectedLetterId: 'ain',
  expectedGlyph: 'عـ',
  mode: 'initial',
  correct: true,
}

function makeWindow(overrides: Partial<HubWindow> = {}): HubWindow {
  return overrides as HubWindow
}

describe('Hub contracts', () => {
  it('normalizes only the three supported difficulties', () => {
    expect(normalizeDifficulty('easy')).toBe('easy')
    expect(normalizeDifficulty('hard')).toBe('hard')
    expect(normalizeDifficulty('unexpected')).toBe('medium')
    expect(normalizeDifficulty(undefined)).toBe('medium')
  })

  it('never reports in preview mode even when globals exist', async () => {
    const recordAttempt = vi.fn().mockResolvedValue({ ok: true })
    const target = makeWindow({ QuizzesHubAdaptive: { recordAttempt } })
    const bridge = new HubBridge('preview', target)

    expect(await bridge.reportRound([attempt], 'medium')).toBe('none')
    expect(recordAttempt).not.toHaveBeenCalled()
  })

  it('uses adaptive reporting first and progress only as a fallback', async () => {
    const adaptiveOk = vi.fn().mockResolvedValue({ ok: true })
    const progress = vi.fn().mockResolvedValue({ ok: true })
    const primaryTarget = makeWindow({
      QuizzesHubAdaptive: { recordAttempt: adaptiveOk },
      QuizzesHubProgress: { record: progress },
    })

    expect(await new HubBridge('production-hub', primaryTarget).reportRound([attempt], 'hard')).toBe('adaptive')
    expect(adaptiveOk).toHaveBeenCalledOnce()
    expect(progress).not.toHaveBeenCalled()

    const adaptiveFail = vi.fn().mockResolvedValue({ ok: false })
    const fallback = vi.fn().mockResolvedValue({ ok: true })
    const fallbackTarget = makeWindow({
      QuizzesHubAdaptive: { recordAttempt: adaptiveFail },
      QuizzesHubProgress: { record: fallback },
    })

    expect(await new HubBridge('production-hub', fallbackTarget).reportRound([attempt], 'medium')).toBe('progress')
    expect(fallback).toHaveBeenCalledOnce()
  })

  it('submits no more than once for one challenge turn', async () => {
    const submitAnswer = vi.fn().mockResolvedValue({ ok: true })
    const target = makeWindow({
      QuizzesHubChallenge: {
        active: true,
        currentUserId: 'user-1',
        canAnswer: () => true,
        onChange: () => () => undefined,
        openHub: () => undefined,
        submitAnswer,
      },
    })
    const bridge = new HubBridge('production-hub', target)

    const first = await bridge.submitChallenge(attempt, 'turn-4')
    const second = await bridge.submitChallenge(attempt, 'turn-4')

    expect(first.ok).toBe(true)
    expect(second).toEqual({ ok: false, reason: 'duplicate-turn' })
    expect(submitAnswer).toHaveBeenCalledOnce()
  })
})
