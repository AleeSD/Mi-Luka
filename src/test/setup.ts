import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Suppress motion/animation noise in tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})) as unknown as typeof IntersectionObserver

// Mock ResizeObserver
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})) as unknown as typeof ResizeObserver

// Suppress known test-noise console.error patterns
const originalError = console.error.bind(console)
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const msg = String(args[0])
    if (
      msg.includes('Warning: An update to') ||
      msg.includes('act(') ||
      msg.includes('not wrapped in act')
    ) return
    originalError(...args)
  }
})
afterAll(() => { console.error = originalError })
