import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function expectNoSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze()
  const blocking = results.violations.filter((violation) => {
    return violation.impact === 'serious' || violation.impact === 'critical'
  })
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([])
}

test('start and active question pass automated accessibility checks', async ({ page }) => {
  await page.goto('?seed=a11y-axe', { waitUntil: 'networkidle' })
  await expect(page.getByRole('button', { name: 'ابدئي المغامرة' })).toBeVisible()
  await expectNoSeriousAxeViolations(page)

  await page.getByRole('button', { name: 'ابدئي المغامرة' }).click()
  await expect(page.getByTestId('answer-option')).toHaveCount(4)
  await expectNoSeriousAxeViolations(page)
})

test('keyboard-only flow has visible focus and advances one question', async ({ page }) => {
  await page.goto('?seed=a11y-keyboard')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'ابدئي المغامرة' })).toBeFocused()
  await page.keyboard.press('Enter')

  const soundButton = page.getByRole('button', { name: 'اسمعي الصوت مرة أخرى' })
  await page.keyboard.press('Tab')
  await expect(soundButton).toBeFocused()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')

  const firstAnswer = page.getByTestId('answer-option').first()
  await expect(firstAnswer).toBeFocused()
  const outlineStyle = await firstAnswer.evaluate((element) => getComputedStyle(element).outlineStyle)
  expect(outlineStyle).not.toBe('none')

  await page.keyboard.press('Space')
  await expect(page.getByTestId('answer-feedback')).toBeVisible()
  await page.keyboard.press('Tab')
  const nextButton = page.getByRole('button', { name: 'السؤال التالي' })
  await expect(nextButton).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('question-counter')).toContainText('٢')
})

test('reduced-motion preference collapses decorative animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('?seed=a11y-motion')
  await page.getByRole('button', { name: 'ابدئي المغامرة' }).click()
  await page.getByRole('button', { name: 'اسمعي الصوت مرة أخرى' }).click()

  const durationSeconds = await page.locator('.echo-rings span').first().evaluate((element) => {
    const duration = getComputedStyle(element).animationDuration
    return Number.parseFloat(duration.endsWith('ms') ? duration : String(Number.parseFloat(duration) * 1000))
  })
  expect(durationSeconds).toBeLessThanOrEqual(0.01)
})
