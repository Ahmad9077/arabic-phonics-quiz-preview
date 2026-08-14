import { expect, test } from '@playwright/test'

test('starts with audio, replays it, and locks only the first answer', async ({ page }) => {
  const audioRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/audio/') && request.url().endsWith('.mp3')) {
      audioRequests.push(request.url())
    }
  })

  await page.goto('?seed=e2e-core')
  await expect(page.getByText('نسخة للمعاينة')).toBeVisible()
  await page.getByRole('button', { name: 'ابدئي المغامرة' }).click()

  const answers = page.getByTestId('answer-option')
  await expect(answers).toHaveCount(4)
  await expect.poll(() => audioRequests.length).toBeGreaterThan(0)

  const beforeReplay = audioRequests.length
  await page.getByRole('button', { name: 'اسمعي الصوت مرة أخرى' }).click()
  await expect.poll(() => audioRequests.length).toBeGreaterThanOrEqual(beforeReplay)

  await answers.evaluateAll((buttons) => {
    const first = buttons[0]
    const second = buttons[1]
    if (!(first instanceof HTMLButtonElement) || !(second instanceof HTMLButtonElement)) {
      throw new Error('Expected two answer buttons.')
    }
    first.click()
    second.click()
  })
  await expect(page.locator('[data-selected="true"]')).toHaveCount(1)
  await expect(answers.nth(0)).toBeDisabled()
  await expect(answers.nth(1)).toBeDisabled()
  await expect(page.getByTestId('answer-feedback')).toBeVisible()
  await page.getByRole('button', { name: 'السؤال التالي' }).click()
  await expect(page.getByTestId('question-counter')).toContainText('٢')
})

test('completes, reviews, replays, and starts a clean round', async ({ page }) => {
  await page.goto('?seed=e2e-results')
  await page.getByRole('button', { name: 'ابدئي المغامرة' }).click()

  for (let question = 0; question < 15; question += 1) {
    const answers = page.getByTestId('answer-option')
    if (question === 0) {
      await answers.evaluateAll((buttons) => {
        if (!(buttons[0] instanceof HTMLButtonElement) || !(buttons[1] instanceof HTMLButtonElement)) {
          throw new Error('Expected two answer buttons.')
        }
        buttons[0].click()
        buttons[1].click()
      })
    } else {
      await answers.first().click()
    }
    await page.getByRole('button', {
      name: question === 14 ? 'شاهدي النتيجة' : 'السؤال التالي',
    }).click()
  }

  await expect(page.getByRole('heading', { name: /نتيجتك/ })).toBeVisible()
  await expect(page.getByTestId('review-item')).toHaveCount(15)
  await expect(page.getByTestId('review-verdict')).toHaveCount(15)
  await expect(page.getByText(/إجابة (صحيحة|غير صحيحة)/).first()).toBeVisible()
  await page.getByTestId('review-audio').first().click()
  await page.getByRole('button', { name: 'جولة جديدة' }).click()
  await expect(page.getByTestId('question-counter')).toContainText('١')
  await expect(page.locator('[data-selected="true"]')).toHaveCount(0)
})
