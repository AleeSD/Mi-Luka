import { type Page } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path'
// @ts-ignore
declare const __dirname: string

dotenv.config({ path: path.resolve(__dirname, '../../.env.test') })

export const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL ?? ''
export const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? ''
export const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? ''
export const TEST_FRESH_PREFIX = process.env.TEST_FRESH_PREFIX ?? 'fresh_test'

/** Login via the Auth page UI. */
export async function loginViaUI(page: Page, email = TEST_USER_EMAIL, password = TEST_USER_PASSWORD) {
  await page.goto('/auth')
  await page.getByPlaceholder(/correo/i).fill(email)
  await page.getByPlaceholder(/contraseña/i).fill(password)
  await page.getByRole('button', { name: /iniciar sesión/i }).click()
  // Wait for redirect out of /auth
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 15000 })
}

/** Logout via profile page or direct nav. */
export async function logoutViaUI(page: Page) {
  await page.goto('/app/perfil')
  const logoutBtn = page.getByRole('button', { name: /cerrar sesión/i })
  if (await logoutBtn.isVisible()) await logoutBtn.click()
  await page.waitForURL(/\/auth/, { timeout: 10000 })
}

/** Generate a unique test email that won't conflict between runs. */
export function freshEmail(): string {
  return `${TEST_FRESH_PREFIX}+${Date.now()}@miluka.dev`
}
