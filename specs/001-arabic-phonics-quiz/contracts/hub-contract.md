# Quizzes Hub Integration Contract

## Stable identity

The stable production quiz id is `arabic-phonics`. It MUST match the future catalog row,
database quiz row, access-guard attribute, manifest `id`/`quizId`, adaptive profiles, progress
payloads, and challenge question keys.

## Compile-mode boundary

| Mode | Hub client scripts | Hub globals consumed | External writes | UI marker |
|---|---|---|---|---|
| `preview` | none | none | forbidden | visible `نسخة للمعاينة` |
| `production-hub` | config, access, challenge, then adaptive/progress when applicable | required/optional per flow | best effort after valid access | no preview marker |

Preview browser tests MUST fail any request whose URL includes `/quizzes-hub/config.js`,
`access-guard.js`, `progress-client.js`, `adaptive-client.js`, `challenge-client.js`, or
`supabase.co`.

## Access

Future production builds load Hub config before access guard, set
`data-quiz-id="arabic-phonics"`, and await:

```ts
window.QuizzesHubAccessReady?: Promise<{ difficulty?: string }>
```

Accepted difficulties are `easy`, `medium`, and `hard`; any other value becomes `medium`.
Preview resolves immediately to `medium` without defining or inspecting this global.

## Adaptive selection

The app waits at most 1,200 ms for:

```ts
window.QuizzesHubAdaptiveReady?: Promise<{ question_keys?: string[] } | undefined>
```

Keys MUST match a known valid variant. Unknown, duplicate, invalid-mode, over-quota, and
duplicate-base entries are discarded. Remaining slots are filled locally.

## Attempt reporting

Primary path:

```ts
window.QuizzesHubAdaptive?.recordAttempt(
  attempts: Array<{ question: { key: string }; correct: boolean }>
): Promise<{ ok: boolean; reason?: string }> | undefined
```

Fallback only if the primary path is absent, rejects, or returns a non-OK result:

```ts
window.QuizzesHubProgress?.record({
  quizId: "arabic-phonics",
  score: number,
  total: 15,
  level?: string,
  details?: Record<string, unknown>
}): Promise<{ ok: boolean; reason?: string }> | undefined
```

Reporting is best effort and MUST NOT block the results screen. It runs once per completed
normal Hub round and never in preview or challenge mode.

## Challenge

Challenge builds consume:

```ts
window.QuizzesHubChallenge?: {
  active: boolean
  currentUserId: string | null
  canAnswer(): boolean
  onChange(listener: (state: ChallengeState) => void): () => void
  openHub(): void
  submitAnswer(answer: {
    answerText: string
    isCorrect: boolean
  }): Promise<{ ok: boolean; reason?: string }>
}

window.QuizzesHubChallengeReady?: Promise<ChallengeState>
```

For every turn, choices are derived from the seed
`arabic-phonics:${questionKey}:${turnIndex}`. Only `canAnswer() === true` permits submission.
The application keeps a submitted-turn id and never calls `submitAnswer` twice for one turn.
Unknown question keys show an Arabic recovery state with a link back to the Hub.

## Deferred production actions

After approval only:

1. Refresh the live `quizzes-hub` checkout from the remote head.
2. Add the catalog entry and bump the live `script.js` cache query.
3. Apply a reviewed migration for the quiz row and 78 adaptive profiles.
4. Assign the quiz only to explicitly selected child profiles.
5. Verify normal launch, adaptive recording, fallback behavior, and challenge mode live.
