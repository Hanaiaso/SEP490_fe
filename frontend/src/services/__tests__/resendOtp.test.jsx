import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/msw/server.js'
import { resendOtp } from '../authService.js'

/**
 * Sheet: FE-Services — L1-FES-07..08 (doc v2.3): gửi lại OTP email.
 *
 * ⚠ Chữ ký thật là `resendOtp(email)` nhận CHUỖI — doc v2.3 ghi `resendOtp({ email })`.
 *   Body gửi lên mới là `{ email }`. Xem authService.js:110.
 */
describe('authService.resendOtp', () => {
  // L1-FES-07 | EP-Valid | Gọi ĐÚNG endpoint mới, KHÔNG còn hack gọi lại /auth/register
  it('L1-FES-07 gọi đúng 1 request tới /api/auth/resend-otp với body { email }', async () => {
    let body = null
    let hits = 0
    let registerHits = 0
    server.use(
      http.post('/api/auth/resend-otp', async ({ request }) => {
        hits += 1
        body = await request.json()
        return HttpResponse.json({ message: 'Mã OTP mới đã được gửi.' })
      }),
      http.post('/api/auth/register', () => {
        registerHits += 1
        return HttpResponse.json({ message: 'không được gọi' })
      }),
    )

    await resendOtp('a@test.com')

    expect(hits).toBe(1)
    expect(body).toEqual({ email: 'a@test.com' })
    expect(registerHits).toBe(0, 'không được dùng lại cách hack gọi /auth/register như bản cũ')
  })

  // L1-FES-08 | EP-Invalid | Server trả 429 (bấm quá nhanh) -> lỗi nổi lên cho UI,
  // KHÔNG coi là đã gửi và KHÔNG tự retry ngầm
  it('L1-FES-08 server trả 429 thì báo lỗi, không tự retry ngầm', async () => {
    let hits = 0
    server.use(http.post('/api/auth/resend-otp', () => {
      hits += 1
      return new HttpResponse(
        JSON.stringify({ message: 'Vui lòng đợi 60 giây trước khi gửi lại.' }),
        { status: 429 },
      )
    }))

    await expect(resendOtp('a@test.com')).rejects.toThrow('Vui lòng đợi 60 giây')
    expect(hits).toBe(1, 'không được tự động gửi lại — người dùng phải chủ động bấm')
  })

  // L1-FES-08 | EP-Invalid | Lỗi 400 (email đã xác minh) cũng phải nổi lên, không nuốt im lặng
  it('L1-FES-08 lỗi 400 từ server cũng phải nổi lên cho UI', async () => {
    server.use(http.post('/api/auth/resend-otp', () =>
      new HttpResponse(
        JSON.stringify({ message: 'Tài khoản này đã được xác minh trước đó.' }),
        { status: 400 },
      )))

    await expect(resendOtp('a@test.com')).rejects.toThrow('đã được xác minh')
  })
})
