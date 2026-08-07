import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/msw/server.js'
import { fetchWithToken } from '../authService.js'

/**
 * Sheet: FE-Services — L1-FES-01..03 (authService.fetchWithToken).
 * Vitest + MSW. Không có TypeScript ở repo này nên file test dùng .jsx.
 */
describe('L1-FES · authService.fetchWithToken', () => {
  // L1-FES-01 | EP-Valid | Request mang header Authorization: Bearer <accessToken>
  it('L1-FES-01 gửi kèm header Authorization và trả JSON cho caller', async () => {
    localStorage.setItem('accessToken', 'jwt-1')
    let capturedAuth = null
    server.use(
      http.get('/api/orders', ({ request }) => {
        capturedAuth = request.headers.get('Authorization')
        return HttpResponse.json({ items: [{ id: 'O1' }], totalCount: 1 })
      }),
    )

    const result = await fetchWithToken('GET', '/orders')

    expect(capturedAuth).toBe('Bearer jwt-1')
    expect(result.totalCount).toBe(1)
  })

  // L1-FES-02 | BC-TRUE | 401 -> silent refresh rồi retry request gốc ĐÚNG 1 LẦN
  //
  // 🔴 SPEC GAP v2.2: fetchWithToken KHÔNG có silent refresh. Gặp 401 nó xoá localStorage và
  // chuyển hướng thẳng sang /login — người dùng bị đăng xuất giữa chừng dù refresh token còn hạn.
  // NFR-SEC02 yêu cầu refresh + retry 1 lần. Test ĐỎ cho tới khi bổ sung cơ chế này.
  it('L1-FES-02 gặp 401 thì refresh token rồi thử lại request gốc một lần', async () => {
    localStorage.setItem('accessToken', 'jwt-expired')
    localStorage.setItem('refreshToken', 'rt-1')

    let ordersCalls = 0
    let refreshCalls = 0
    server.use(
      http.get('/api/orders', () => {
        ordersCalls += 1
        return ordersCalls === 1
          ? new HttpResponse(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })
          : HttpResponse.json({ items: [], totalCount: 0, retried: true })
      }),
      http.post('/api/auth/refresh', () => {
        refreshCalls += 1
        return HttpResponse.json({ data: { accessToken: 'jwt-2', refreshToken: 'rt-2' } })
      }),
    )

    const result = await fetchWithToken('GET', '/orders')

    expect(refreshCalls).toBe(1)
    expect(ordersCalls).toBe(2)
    expect(result.retried).toBe(true)
  })

  // L1-FES-03 | BC-FALSE | Refresh cũng hỏng -> xoá session + chuyển về /login, KHÔNG lặp vô hạn
  it('L1-FES-03 refresh thất bại thì xoá session và chuyển về /login, không lặp vô hạn', async () => {
    localStorage.setItem('accessToken', 'jwt-expired')
    localStorage.setItem('user', JSON.stringify({ id: 'U1' }))

    let ordersCalls = 0
    server.use(
      http.get('/api/orders', () => {
        ordersCalls += 1
        return new HttpResponse(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })
      }),
      http.post('/api/auth/refresh', () =>
        new HttpResponse(JSON.stringify({ message: 'Refresh token hết hạn' }), { status: 401 })),
    )

    // jsdom ném "Not implemented: navigation" khi gán window.location.href thật.
    // Chỉ ghi đè RIÊNG property href (không thay cả object location — làm vậy sẽ mất origin
    // và localStorage sẽ trỏ sang storage area khác).
    const redirects = []
    const realLocation = window.location
    const stub = {
      origin: realLocation.origin,
      protocol: realLocation.protocol,
      host: realLocation.host,
      hostname: realLocation.hostname,
      port: realLocation.port,
      pathname: realLocation.pathname,
      search: realLocation.search,
      hash: realLocation.hash,
      assign: (value) => redirects.push(value),
      replace: (value) => redirects.push(value),
      reload: () => {},
      toString: () => realLocation.origin + realLocation.pathname,
    }
    Object.defineProperty(stub, 'href', {
      configurable: true,
      set(value) { redirects.push(value) },
      get() { return redirects.at(-1) ?? realLocation.origin + realLocation.pathname },
    })
    Object.defineProperty(window, 'location', { configurable: true, writable: true, value: stub })

    try {
      await expect(fetchWithToken('GET', '/orders')).rejects.toThrow()

      expect(localStorage.getItem('accessToken')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
      expect(redirects).toContain('/login')
      expect(ordersCalls).toBeLessThanOrEqual(2)
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, writable: true, value: realLocation })
    }
  })
})
