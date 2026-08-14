import type { Difficulty, QuizSource } from '../domain/types'
import type {
  BuildMode,
  ChallengeState,
  HubAdaptivePlan,
  HubWindow,
} from './contracts'

const HUB_ASSET_ROOT = 'https://ahmad9077.github.io/quizzes-hub'
const ACCESS_TIMEOUT_MS = 10_000
const ADAPTIVE_TIMEOUT_MS = 1_200

export interface BootstrapContext {
  mode: BuildMode
  difficulty: Difficulty
  preferredKeys: string[]
  source: QuizSource
  challengeState: ChallengeState | null
}

export function normalizeDifficulty(value: string | undefined): Difficulty {
  return value === 'easy' || value === 'hard' || value === 'medium' ? value : 'medium'
}

function loadScript(documentTarget: Document, src: string, quizId?: string): Promise<void> {
  const existing = documentTarget.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
  if (existing?.dataset.loaded === 'true') return Promise.resolve()

  return new Promise((resolve, reject) => {
    const script = existing ?? documentTarget.createElement('script')

    const finish = () => {
      script.dataset.loaded = 'true'
      resolve()
    }

    script.addEventListener('load', finish, { once: true })
    script.addEventListener('error', () => reject(new Error(`Unable to load ${src}.`)), { once: true })

    if (!existing) {
      script.src = src
      script.async = false
      if (quizId) script.dataset.quizId = quizId
      documentTarget.head.append(script)
    }
  })
}

function withTimeout<T>(promise: Promise<T>, durationMs: number, fallback?: T): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      if (arguments.length >= 3) resolve(fallback as T)
      else reject(new Error('Hub client timed out.'))
    }, durationMs)

    promise.then(
      (value) => {
        window.clearTimeout(timeout)
        resolve(value)
      },
      (error: unknown) => {
        window.clearTimeout(timeout)
        reject(error)
      },
    )
  })
}

function hubWindow(target: Window): HubWindow {
  return target as unknown as HubWindow
}

async function loadRequiredClients(documentTarget: Document): Promise<void> {
  await loadScript(documentTarget, `${HUB_ASSET_ROOT}/config.js?v=4`)
  await loadScript(documentTarget, `${HUB_ASSET_ROOT}/access-guard.js?v=3`, 'arabic-phonics')
}

async function adaptivePlan(target: HubWindow): Promise<HubAdaptivePlan | undefined> {
  if (!target.QuizzesHubAdaptiveReady) return undefined
  return withTimeout(target.QuizzesHubAdaptiveReady, ADAPTIVE_TIMEOUT_MS, undefined)
}

export async function bootstrapQuiz(
  mode: BuildMode,
  windowTarget: Window = window,
  documentTarget: Document = document,
): Promise<BootstrapContext> {
  if (mode === 'preview') {
    return {
      mode,
      difficulty: 'medium',
      preferredKeys: [],
      source: 'preview',
      challengeState: null,
    }
  }

  await loadRequiredClients(documentTarget)
  const target = hubWindow(windowTarget)
  const access = await withTimeout(
    target.QuizzesHubAccessReady ?? Promise.reject(new Error('Hub access client is unavailable.')),
    ACCESS_TIMEOUT_MS,
  )
  const difficulty = normalizeDifficulty(access.difficulty)
  const params = new URLSearchParams(windowTarget.location.search)

  if (params.has('challenge_session')) {
    await loadScript(documentTarget, `${HUB_ASSET_ROOT}/challenge-client.js?v=1`, 'arabic-phonics')
    const challengeState = await withTimeout(
      target.QuizzesHubChallengeReady ?? Promise.reject(new Error('Challenge client is unavailable.')),
      ACCESS_TIMEOUT_MS,
    )

    return { mode, difficulty, preferredKeys: [], source: 'challenge', challengeState }
  }

  await loadScript(documentTarget, `${HUB_ASSET_ROOT}/progress-client.js?v=6`, 'arabic-phonics')
    .catch(() => undefined)
  await loadScript(documentTarget, `${HUB_ASSET_ROOT}/adaptive-client.js?v=2`, 'arabic-phonics')
    .catch(() => undefined)
  const plan = await adaptivePlan(target).catch(() => undefined)

  return {
    mode,
    difficulty,
    preferredKeys: Array.isArray(plan?.question_keys) ? plan.question_keys : [],
    source: 'hub',
    challengeState: null,
  }
}
