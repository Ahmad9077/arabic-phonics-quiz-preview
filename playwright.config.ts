import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4173/arabic-phonics-quiz-preview/'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev -- --host 127.0.0.1',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npx vite --mode production-hub --host 127.0.0.1 --port 4174',
      url: 'http://127.0.0.1:4174/arabic-phonics-quiz/',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
