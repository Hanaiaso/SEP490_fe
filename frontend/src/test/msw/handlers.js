import { http, HttpResponse } from 'msw'

/**
 * Handler mặc định dùng chung cho mọi test. Test nào cần hành vi khác thì
 * override bằng server.use(...) ngay trong test đó.
 */
export const handlers = [
  // ─── Auth ────────────────────────────────────────────────────────────────
  http.post('/api/auth/login', async () => HttpResponse.json({
    data: {
      accessToken: 'jwt-1',
      refreshToken: 'rt-1',
      user: { id: 'U1', fullName: 'Nguyễn Văn A', email: 'a@test.com', role: 'Customer' },
    },
  })),

  http.post('/api/auth/logout', () => HttpResponse.json({ message: 'OK' })),

  http.post('/api/auth/refresh', () => HttpResponse.json({
    data: { accessToken: 'jwt-2', refreshToken: 'rt-2' },
  })),

  // ─── Cart ────────────────────────────────────────────────────────────────
  http.get('/api/cart', () => HttpResponse.json(emptyCart())),

  http.post('/api/cart/items', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json(cartWith(body.productId, body.quantity))
  }),

  // ─── Orders / Notifications ──────────────────────────────────────────────
  http.get('/api/orders', () => HttpResponse.json({ items: [], totalCount: 0 })),
  // NotificationBell đọc field `unreadCount` (không phải `count`) — bám đúng contract thật.
  http.get('/api/notifications/unread-count', () => HttpResponse.json({ unreadCount: 3 })),
  http.get('/api/notifications', () => HttpResponse.json([])),
]

export function emptyCart() {
  return { id: 'C1', items: [], totalItems: 0, totalPrice: 0 }
}

export function cartWith(productId, quantity, unitPrice = 50000) {
  return {
    id: 'C1',
    items: [{ id: 'CI1', productId, productName: 'Ống PVC D21', quantity, unitPrice }],
    totalItems: quantity,
    totalPrice: quantity * unitPrice,
  }
}
