import { test, expect } from '@playwright/test'
import { loginViaUI, logoutViaUI, TEST_USER_EMAIL, TEST_USER_PASSWORD } from './helpers/auth'

test.describe('Auth — login y logout', () => {
  test('login exitoso redirige fuera de /auth', async ({ page }) => {
    await loginViaUI(page)
    expect(page.url()).not.toContain('/auth')
  })

  test('password incorrecto muestra error', async ({ page }) => {
    await page.goto('/auth')
    await page.getByPlaceholder(/correo/i).fill(TEST_USER_EMAIL)
    await page.getByPlaceholder(/contraseña/i).fill('WrongPass!999')
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    // Error message should appear
    await expect(page.getByText(/credenciales|contraseña|inválid/i)).toBeVisible({ timeout: 10000 })
  })

  test('logout redirige a /auth', async ({ page }) => {
    await loginViaUI(page)
    await logoutViaUI(page)
    expect(page.url()).toContain('/auth')
  })

  test('ruta /app/* sin auth redirige a /auth', async ({ page }) => {
    await page.goto('/app/dashboard')
    await page.waitForURL(/\/auth/, { timeout: 10000 })
    expect(page.url()).toContain('/auth')
  })

  test('después del login, /auth redirige a /app', async ({ page }) => {
    await loginViaUI(page)
    // Now try visiting /auth — should redirect back to app
    await page.goto('/auth')
    await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 10000 })
    expect(page.url()).toContain('/app')
  })
})
