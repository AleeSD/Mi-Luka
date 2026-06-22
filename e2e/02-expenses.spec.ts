import { test, expect } from '@playwright/test'
import { loginViaUI } from './helpers/auth'

test.describe('Gastos', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page)
    await page.goto('/app/agregar-gasto')
  })

  test('registrar un gasto navega de vuelta al dashboard', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /gasto/i })).toBeVisible()

    // Fill form
    await page.getByLabel(/monto/i).fill('25')
    // Select category
    await page.locator('[data-category="comida"], button:has-text("Comida")').first().click()
    // Description
    await page.getByPlaceholder(/descripción/i).fill('Almuerzo E2E')

    await page.getByRole('button', { name: /registrar/i }).click()

    // Should redirect back to /app or show success
    await page.waitForURL((url) => !url.pathname.includes('agregar-gasto'), { timeout: 15000 })
  })

  test('formulario de gasto tiene campos accesibles con labels', async ({ page }) => {
    // Monto input debe existir
    const montoInput = page.getByLabel(/monto/i)
    await expect(montoInput).toBeVisible()
  })

  test('gasto con monto 0 muestra error de validación', async ({ page }) => {
    await page.getByLabel(/monto/i).fill('0')
    await page.getByRole('button', { name: /registrar/i }).click()
    await expect(page.getByText(/mayor a 0|requerido|válido/i)).toBeVisible({ timeout: 5000 })
  })
})
