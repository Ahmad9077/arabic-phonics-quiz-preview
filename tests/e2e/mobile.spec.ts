import { expect, test } from '@playwright/test'

test('active question and feedback fit without document scrolling at 390 x 844', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('?seed=mobile-fit')
  await page.getByRole('button', { name: 'ابدئي المغامرة' }).click()

  const answers = page.getByTestId('answer-option')
  await expect(answers).toHaveCount(4)
  await answers.first().click()
  await expect(page.getByRole('button', { name: 'السؤال التالي' })).toBeVisible()

  const geometry = await page.evaluate(() => ({
    viewportHeight: window.innerHeight,
    documentHeight: document.documentElement.scrollHeight,
    horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth,
    answerBottom: document.querySelector('.answer-grid')?.getBoundingClientRect().bottom ?? Infinity,
    actionBottom: document.querySelector('.next-button')?.getBoundingClientRect().bottom ?? Infinity,
  }))

  expect(geometry.documentHeight).toBeLessThanOrEqual(geometry.viewportHeight)
  expect(geometry.horizontalOverflow).toBeLessThanOrEqual(0)
  expect(geometry.answerBottom).toBeLessThanOrEqual(geometry.viewportHeight)
  expect(geometry.actionBottom).toBeLessThanOrEqual(geometry.viewportHeight)
})

test('all core controls remain operable at 320 pixels wide', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('?seed=mobile-320')
  await page.getByRole('button', { name: 'ابدئي المغامرة' }).click()

  const answers = page.getByTestId('answer-option')
  await expect(answers).toHaveCount(4)
  const widths = await answers.evaluateAll((elements) => {
    return elements.map((element) => {
      const rect = element.getBoundingClientRect()
      return { width: rect.width, height: rect.height, left: rect.left, right: rect.right }
    })
  })

  expect(widths.every(({ width, height, left, right }) => {
    return width >= 44 && height >= 44 && left >= 0 && right <= 320
  })).toBe(true)

  await answers.last().click()
  await page.getByRole('button', { name: 'السؤال التالي' }).click()
  await expect(page.getByTestId('question-counter')).toContainText('٢')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
})
