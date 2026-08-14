import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const audioCalls: Array<{ rate: number; src: string }> = []
    Object.defineProperty(window, '__audioComparisonCalls', {
      configurable: true,
      value: audioCalls,
    })

    HTMLMediaElement.prototype.play = function play() {
      audioCalls.push({ rate: this.playbackRate, src: this.src })
      return Promise.resolve()
    }

    HTMLMediaElement.prototype.pause = function pause() {}
  })
})

test('offers five A/B comparisons and keeps playback at natural speed', async ({ page }) => {
  await page.goto('audio-comparison.html')

  await expect(page.getByRole('heading', { name: 'أي نطق أوضح؟' })).toBeVisible()
  await expect(page.locator('.letter-card')).toHaveCount(5)
  await expect(page.getByRole('button', { name: /اسمع النسخة/ })).toHaveCount(10)

  const ainCard = page.locator('[data-letter="ain"]')
  const ainVersionB = ainCard.locator('[data-version="b"]')
  await ainVersionB.click()

  await expect(ainVersionB).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('status')).toContainText('حرف العين — النسخة B')

  const calls = await page.evaluate(() => {
    return (window as typeof window & { __audioComparisonCalls: Array<{ rate: number; src: string }> })
      .__audioComparisonCalls
  })
  expect(calls).toHaveLength(1)
  expect(calls[0].rate).toBe(1)
  expect(calls[0].src).toContain('/audio-comparison/ain-clear.mp3?v=ab1')

  const hahVersionA = page.locator('[data-letter="hah"] [data-version="a"]')
  await hahVersionA.click()
  await expect(ainVersionB).toHaveAttribute('aria-pressed', 'false')
  await expect(hahVersionA).toHaveAttribute('aria-pressed', 'true')
})

test('comparison page is accessible and fits at 320 pixels wide', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('audio-comparison.html')

  const results = await new AxeBuilder({ page }).analyze()
  const blocking = results.violations.filter((violation) => {
    return violation.impact === 'serious' || violation.impact === 'critical'
  })

  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)

  const minimumControlSize = await page.locator('.audio-button').evaluateAll((buttons) => {
    return buttons.every((button) => {
      const rect = button.getBoundingClientRect()
      return rect.width >= 44 && rect.height >= 44
    })
  })
  expect(minimumControlSize).toBe(true)
})

test('all proposed audio files are served as MP3 assets', async ({ request }) => {
  for (const letterId of ['ain', 'hah', 'dad', 'qaf', 'seen']) {
    const response = await request.get(`audio-comparison/${letterId}-clear.mp3?v=ab1`)
    expect(response.ok(), letterId).toBe(true)
    expect(response.headers()['content-type']).toContain('audio/mpeg')
    expect((await response.body()).byteLength).toBeGreaterThan(10_000)
  }
})
