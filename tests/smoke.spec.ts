import { test, expect } from '@playwright/test'
import { captureConsoleErrors } from './helpers/errors'

/**
 * Smoke tests covering both page kinds this template ships:
 *   - '/'      → the static landing (top level of src/pages/): no providers,
 *                so no auth fetch and no records WebSocket on load.
 *   - '/dashboard'  → a protected dynamic page (under src/pages/(app)/(protected)/):
 *                signed-out visitors see the DeepSpace sign-in overlay.
 *
 * The "static contract" test is the guardrail for the per-page opt-out: if
 * someone moves the providers back up into _app.tsx, it fails.
 */

/** Wait for the React app shell (present on every page). */
async function waitForApp(page: import('@playwright/test').Page) {
  await page.waitForSelector('[data-testid="app-root"]', { timeout: 15000 })
}

test.describe('Smoke tests', () => {
  test('static landing loads without JS errors', async ({ page }) => {
    const errors = captureConsoleErrors(page)
    await page.goto('/')
    await waitForApp(page)
    await expect(page.getByTestId('static-landing')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('landing carries one title, one description, one canonical', async ({ page }) => {
    // <Seo> (src/pages/index.tsx, values from src/seo.ts) hoists these into
    // <head>. Exactly one of each: index.html ships no static description or
    // canonical, because React 19 would not dedupe against them on mount.
    await page.goto('/')
    await expect(page.getByTestId('static-landing')).toBeVisible()
    await expect(page).toHaveTitle(/\S/)
    expect(await page.locator('head meta[name="description"]').count()).toBe(1)
    expect(await page.locator('head link[rel="canonical"]').count()).toBe(1)
  })

  test('static contract: landing fires no auth request, opens no websocket', async ({ page }) => {
    const offenders: string[] = []
    page.on('request', (req) => {
      if (req.url().includes('/api/auth/')) offenders.push(req.url())
    })
    // Only the DO room route counts — vite's own HMR socket is a dev artifact.
    page.on('websocket', (ws) => {
      if (new URL(ws.url()).pathname.startsWith('/ws/')) offenders.push(`ws: ${ws.url()}`)
    })
    await page.goto('/')
    await expect(page.getByTestId('static-landing')).toBeVisible()
    await page.waitForTimeout(1500)
    expect(offenders).toEqual([])
  })

  test('dashboard requires sign-in before mounting', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByTestId('app-navigation')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('auth-overlay')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('dashboard-page')).toHaveCount(0)
  })

  test('legacy dashboard URL redirects to the canonical route', async ({ page }) => {
    await page.goto('/home')
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('unknown route shows 404', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz')
    await waitForApp(page)
    await expect(page.locator('text=404')).toBeVisible()
  })
})
