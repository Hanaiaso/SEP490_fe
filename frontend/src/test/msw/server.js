import { setupServer } from 'msw/node'
import { handlers } from './handlers.js'

/**
 * MSW server dùng chung cho toàn bộ test Vitest (Node environment).
 * Vòng đời listen/reset/close được đăng ký một lần trong src/test/setup.js.
 */
export const server = setupServer(...handlers)
