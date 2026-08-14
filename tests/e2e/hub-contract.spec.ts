import { expect, test } from '@playwright/test'

const bannedPreviewFragments = [
  '/quizzes-hub/config.js',
  'access-guard.js',
  'progress-client.js',
  'adaptive-client.js',
  'challenge-client.js',
  'supabase.co',
]

test('preview makes no Hub or Supabase request', async ({ page }) => {
  const violations: string[] = []
  page.on('request', (request) => {
    if (bannedPreviewFragments.some((fragment) => request.url().includes(fragment))) {
      violations.push(request.url())
    }
  })

  await page.goto('?seed=preview-isolation')
  await page.getByRole('button', { name: 'ابدئي المغامرة' }).click()
  await page.getByTestId('answer-option').first().click()

  expect(violations).toEqual([])
  await expect(page.getByText('نسخة للمعاينة')).toBeVisible()
})

test('production mode consumes access, adaptive preferences, and reports once', async ({ page }) => {
  await page.route('**/quizzes-hub/config.js*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.QUIZZES_HUB_CONFIG = { supabaseUrl: "stub", supabaseAnonKey: "stub" };',
  }))
  await page.route('**/quizzes-hub/access-guard.js*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.QuizzesHubAccessReady = Promise.resolve({ ok: true, quizId: "arabic-phonics", difficulty: "hard" }); document.documentElement.dataset.quizAccess = "granted";',
  }))
  await page.route('**/quizzes-hub/progress-client.js*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.QuizzesHubProgress = { record: async (payload) => { window.__testProgress = payload; return { ok: true }; } };',
  }))
  await page.route('**/quizzes-hub/adaptive-client.js*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.QuizzesHubAdaptiveReady = Promise.resolve({ question_keys: ["ain:initial"] }); window.QuizzesHubAdaptive = { recordAttempt: async (items) => { window.__testAdaptive = items; return { ok: true }; } };',
  }))

  await page.goto('http://127.0.0.1:4174/arabic-phonics-quiz/')
  await expect(page.getByText('تحدّي الأشكال')).toBeVisible()
  await page.getByRole('button', { name: 'ابدئي المغامرة' }).click()

  for (let question = 0; question < 15; question += 1) {
    await page.getByTestId('answer-option').first().click()
    await page.getByRole('button', {
      name: question === 14 ? 'شاهدي النتيجة' : 'السؤال التالي',
    }).click()
  }

  await expect.poll(() => page.evaluate(() => {
    return Array.isArray((window as unknown as { __testAdaptive?: unknown[] }).__testAdaptive)
      ? (window as unknown as { __testAdaptive: unknown[] }).__testAdaptive.length
      : 0
  })).toBe(15)
  expect(await page.evaluate(() => (window as unknown as { __testProgress?: unknown }).__testProgress)).toBeUndefined()
})

test('challenge mode renders the shared turn and submits only once', async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as unknown as {
      Audio: typeof Audio
      __testAudioEvents: Array<{ action: string; src: string }>
    }
    target.__testAudioEvents = []

    class FakeAudio {
      currentTime = 0
      preload = 'auto'
      private readonly listeners = new Map<string, Array<() => void>>()

      constructor(readonly src: string) {}

      addEventListener(name: string, listener: () => void): void {
        const listeners = this.listeners.get(name) ?? []
        listeners.push(listener)
        this.listeners.set(name, listeners)
      }

      load(): void {
        target.__testAudioEvents.push({ action: 'load', src: this.src })
      }

      pause(): void {
        target.__testAudioEvents.push({ action: 'pause', src: this.src })
      }

      async play(): Promise<void> {
        target.__testAudioEvents.push({ action: 'play', src: this.src })
        this.listeners.get('playing')?.forEach((listener) => listener())
      }
    }

    target.Audio = FakeAudio as unknown as typeof Audio
  })

  await page.route('**/quizzes-hub/config.js*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.QUIZZES_HUB_CONFIG = { supabaseUrl: "stub", supabaseAnonKey: "stub" };',
  }))
  await page.route('**/quizzes-hub/access-guard.js*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.QuizzesHubAccessReady = Promise.resolve({ ok: true, quizId: "arabic-phonics", difficulty: "medium" }); document.documentElement.dataset.quizAccess = "granted";',
  }))
  await page.route('**/quizzes-hub/challenge-client.js*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `
      window.__testChallengeSubmissions = [];
      const state = {
        current_answering_user_id: "user-1",
        current_question_key: "ain:final",
        current_turn_index: 3,
        last_turn: null,
        players: [{ display_name: "سارة", user_id: "user-1", wrong_count: 0 }],
        status: "active",
        winner_id: null
      };
      window.QuizzesHubChallenge = {
        active: true,
        currentUserId: "user-1",
        canAnswer: () => true,
        onChange: (listener) => {
          window.__testPushChallenge = (nextState) => listener(nextState);
          listener(state);
          return () => {};
        },
        openHub: () => {},
        submitAnswer: async (answer) => { window.__testChallengeSubmissions.push(answer); return { ok: true }; }
      };
      window.QuizzesHubChallengeReady = Promise.resolve(state);
    `,
  }))

  await page.goto('http://127.0.0.1:4174/arabic-phonics-quiz/?challenge_session=test')
  const answers = page.getByTestId('answer-option')
  await expect(answers).toHaveCount(4)
  await answers.evaluateAll((buttons) => {
    if (!(buttons[0] instanceof HTMLButtonElement) || !(buttons[1] instanceof HTMLButtonElement)) {
      throw new Error('Expected two answer buttons.')
    }
    buttons[0].click()
    buttons[1].click()
  })

  await expect.poll(() => page.evaluate(() => {
    return (window as unknown as { __testChallengeSubmissions: unknown[] }).__testChallengeSubmissions.length
  })).toBe(1)
  const submittedAndDisplayed = await page.evaluate(() => {
    const submission = (window as unknown as {
      __testChallengeSubmissions: Array<{ answerText: string }>
    }).__testChallengeSubmissions[0]
    const displayed = document.querySelector<HTMLElement>('[data-selected="true"] .answer-glyph')
    return { submitted: submission?.answerText, displayed: displayed?.textContent }
  })
  expect(submittedAndDisplayed.displayed).toBe(submittedAndDisplayed.submitted)

  await page.getByRole('button', { name: 'اسمعي الصوت مرة أخرى' }).click()
  await page.evaluate(() => {
    const target = window as unknown as {
      __testPushChallenge: (state: unknown) => void
    }
    target.__testPushChallenge({
      current_answering_user_id: 'user-1',
      current_question_key: 'beh:initial',
      current_turn_index: 4,
      last_turn: { is_correct: true },
      players: [{ display_name: 'سارة', user_id: 'user-1', wrong_count: 0 }],
      status: 'active',
      winner_id: null,
    })
  })

  await expect.poll(() => page.evaluate(() => {
    return (window as unknown as {
      __testAudioEvents: Array<{ action: string; src: string }>
    }).__testAudioEvents
  })).toEqual(expect.arrayContaining([
    expect.objectContaining({ action: 'play', src: expect.stringContaining('/ain.mp3') }),
    expect.objectContaining({ action: 'pause', src: expect.stringContaining('/ain.mp3') }),
    expect.objectContaining({ action: 'load', src: expect.stringContaining('/beh.mp3') }),
  ]))
  await expect(page.getByTestId('answer-option')).toHaveCount(4)

  await page.getByRole('button', { name: 'اسمعي الصوت مرة أخرى' }).click()
  await page.evaluate(() => {
    const target = window as unknown as {
      __testPushChallenge: (state: unknown) => void
    }
    target.__testPushChallenge({
      current_answering_user_id: null,
      current_question_key: 'beh:initial',
      current_turn_index: 4,
      last_turn: { is_correct: true },
      players: [{ display_name: 'سارة', user_id: 'user-1', wrong_count: 0 }],
      status: 'finished',
      winner_id: 'user-1',
    })
  })
  await expect(page.getByRole('heading', { name: 'فازت سارة!' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => {
    return (window as unknown as {
      __testAudioEvents: Array<{ action: string; src: string }>
    }).__testAudioEvents
  })).toEqual(expect.arrayContaining([
    expect.objectContaining({ action: 'play', src: expect.stringContaining('/beh.mp3') }),
    expect.objectContaining({ action: 'pause', src: expect.stringContaining('/beh.mp3') }),
  ]))
})
