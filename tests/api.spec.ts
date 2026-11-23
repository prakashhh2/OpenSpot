import { test, expect } from '@playwright/test'

test.describe('API tests', () => {
  test('auth proxy forwards to auth worker', async ({ request }) => {
    const res = await request.get('/api/auth/ok')
    expect(res.ok()).toBeTruthy()
  })

  test('dashboard is protected before mounting realtime queries', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForSelector('[data-testid="auth-overlay"]', { timeout: 15000 })
    await expect(page.getByTestId('dashboard-page')).toHaveCount(0)
  })
})
