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
      http.post('/api/auth/refresh-token', () => {
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
    localStorage.setItem('authUser', JSON.stringify({ id: 'U1' }))

    let ordersCalls = 0
    server.use(
      http.get('/api/orders', () => {
        ordersCalls += 1
        return new HttpResponse(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })
      }),
      http.post('/api/auth/refresh-token', () =>
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
      expect(localStorage.getItem('authUser')).toBeNull()
      expect(redirects).toContain('/login')
      expect(ordersCalls).toBeLessThanOrEqual(2)
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, writable: true, value: realLocation })
    }
  })

  // L1-FES-04 | Race condition | Nhiều request 401 đồng thời chỉ được refresh MỘT lần (dùng
  // chung 1 promise in-flight), tránh trường hợp refresh token bị rotate làm các lần refresh
  // song song sau bị từ chối và đăng xuất oan một phiên còn hợp lệ.
  it('L1-FES-04 nhiều request 401 đồng thời chỉ gọi refresh-token đúng 1 lần', async () => {
    localStorage.setItem('accessToken', 'jwt-expired')
    localStorage.setItem('refreshToken', 'rt-1')

    let refreshCalls = 0
    const orderCallCountByPath = { '/api/orders': 0, '/api/cart': 0, '/api/profile': 0 }
    server.use(
      http.get('/api/orders', () => {
        orderCallCountByPath['/api/orders'] += 1
        return orderCallCountByPath['/api/orders'] === 1
          ? new HttpResponse(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })
          : HttpResponse.json({ ok: true, from: 'orders' })
      }),
      http.get('/api/cart', () => {
        orderCallCountByPath['/api/cart'] += 1
        return orderCallCountByPath['/api/cart'] === 1
          ? new HttpResponse(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })
          : HttpResponse.json({ ok: true, from: 'cart' })
      }),
      http.get('/api/profile', () => {
        orderCallCountByPath['/api/profile'] += 1
        return orderCallCountByPath['/api/profile'] === 1
          ? new HttpResponse(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })
          : HttpResponse.json({ ok: true, from: 'profile' })
      }),
      http.post('/api/auth/refresh-token', () => {
        refreshCalls += 1
        return HttpResponse.json({ data: { accessToken: 'jwt-2', refreshToken: 'rt-2' } })
      }),
    )

    const [r1, r2, r3] = await Promise.all([
      fetchWithToken('GET', '/orders'),
      fetchWithToken('GET', '/cart'),
      fetchWithToken('GET', '/profile'),
    ])

    expect(refreshCalls).toBe(1)
    expect(r1.ok && r2.ok && r3.ok).toBe(true)
    expect(localStorage.getItem('accessToken')).toBe('jwt-2')
    expect(localStorage.getItem('refreshToken')).toBe('rt-2')
  })
})
