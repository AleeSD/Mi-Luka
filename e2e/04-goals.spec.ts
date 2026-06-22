import { test, expect } from '@playwright/test'
import { loginViaUI } from './helpers/auth'

test.describe('Metas', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page)
    await page.goto('/app/metas')
  })

  test('página de metas carga sin errores', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /meta/i })).toBeVisible({ timeout: 10000 })
  })

  test('botón nueva meta está accesible', async ({ page }) => {
    const newBtn = page.getByRole('button', { name: /nueva meta/i })
    await expect(newBtn).toBeVisible({ timeout: 10000 })
  })

  test('crear meta con formulario abre y cierra el diálogo', async ({ page }) => {
    // Open dialog
    await page.getByRole('button', { name: /nueva meta/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Fill título
    await page.getByLabel(/título/i).fill('Meta E2E')
    // Fill monto
    await page.getByLabel(/monto objetivo/i).fill('500')

    // Cancel and verify dialog closes
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible({ timeout: 5000 })
  })
})
