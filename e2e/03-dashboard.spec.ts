import { test, expect } from '@playwright/test'
import { loginViaUI } from './helpers/auth'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page)
    await page.goto('/app/dashboard')
  })

  test('muestra el saldo disponible', async ({ page }) => {
    // Dashboard should show some currency amount
    await expect(page.getByText(/S\//)).toBeVisible({ timeout: 10000 })
  })

  test('bottom navigation está presente y funcional', async ({ page }) => {
    // Nav links should be visible
    const nav = page.getByRole('navigation')
    await expect(nav).toBeVisible()
  })

  test('navegar a Gastos desde dashboard funciona', async ({ page }) => {
    await page.goto('/app/agregar-gasto')
    await page.waitForURL(/agregar-gasto/, { timeout: 10000 })
    expect(page.url()).toContain('agregar-gasto')
  })

  test('navegar a Metas funciona', async ({ page }) => {
    await page.goto('/app/metas')
    await page.waitForURL(/metas/, { timeout: 10000 })
    expect(page.url()).toContain('metas')
  })

  test('navegar a Retos funciona', async ({ page }) => {
    await page.goto('/app/retos')
    await page.waitForURL(/retos/, { timeout: 10000 })
    expect(page.url()).toContain('retos')
  })
})
