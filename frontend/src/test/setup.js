import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { server } from './msw/server.js'

Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true,
})

// jsdom chưa có IntersectionObserver / ResizeObserver — motion/react và một số component dùng tới.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] }
}
vi.stubGlobal('IntersectionObserver', NoopObserver)
vi.stubGlobal('ResizeObserver', NoopObserver)

// matchMedia được motion/react đọc để phát hiện prefers-reduced-motion.
vi.stubGlobal('matchMedia', (query) => ({
  matches: false,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
}))

// fetch tương đối ('/api/...') cần một base URL tuyệt đối để MSW/undici phân giải được.
// jsdom mặc định chạy ở http://localhost:3000 nên chỉ cần trỏ handler tới cùng origin.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  cleanup()
  server.resetHandlers()
  localStorage.clear()
  vi.restoreAllMocks()
})

afterAll(() => server.close())
