import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/msw/server.js'
import { api } from '../api.js'

/**
 * Sheet: FE-Services — ⊕ v2.3 (L1-FES-09). Hạ tầng dùng chung cho toàn bộ trang Admin/CEO mới.
 * Bổ sung sau rà soát 01/08/2026: api.js được 6 service mới dùng chung nhưng chưa có test nào.
 *
 * Điểm dễ sai đang được khoá lại: cleanUrl() cắt tiền tố '/api' vì fetchWithToken TỰ THÊM '/api'.
 * Gọi sai một trong hai kiểu là request đi tới '/api/api/...' hoặc thiếu prefix.
 */
describe('L1-FES-09 · api.js wrapper', () => {
  // L1-FES-09 | EP-Valid | Cả 2 kiểu URL đều phải ra đúng 1 endpoint duy nhất
  it.each([
    ['/api/vehicles', 'truyền kèm tiền tố /api'],
    ['/vehicles', 'truyền không kèm tiền tố'],
  ])('L1-FES-09 api.get("%s") gọi đúng /api/vehicles (%s)', async (inputUrl) => {
    localStorage.setItem('accessToken', 'jwt-1')
    let hit = 0
    server.use(http.get('/api/vehicles', () => { hit += 1; return HttpResponse.json([{ id: 'V1' }]) }))

    const res = await api.get(inputUrl)

    expect(hit).toBe(1)
    expect(res.data).toEqual([{ id: 'V1' }])
  })

  // L1-FES-09 | EP-Valid | post/put/delete bọc đúng method và trả về hình dạng { data }
  it('L1-FES-09 post/put/delete gửi đúng method, body và trả về { data }', async () => {
    localStorage.setItem('accessToken', 'jwt-1')
    const seen = []
    server.use(
      http.post('/api/vehicles', async ({ request }) => {
        seen.push({ method: 'POST', body: await request.json() })
        return HttpResponse.json({ id: 'V1' })
      }),
      http.put('/api/vehicles/V1', async ({ request }) => {
        seen.push({ method: 'PUT', body: await request.json() })
        return HttpResponse.json({ id: 'V1', isActive: false })
      }),
      http.delete('/api/vehicles/V1', () => {
        seen.push({ method: 'DELETE' })
        return HttpResponse.json({ message: 'OK' })
      }),
    )

    const created = await api.post('/api/vehicles', { vehicleNumber: 1, licensePlate: '51C-12345' })
    const updated = await api.put('/api/vehicles/V1', { licensePlate: '51C-12345', isActive: false })
    await api.delete('/api/vehicles/V1')

    expect(seen.map((s) => s.method)).toEqual(['POST', 'PUT', 'DELETE'])
    expect(seen[0].body).toEqual({ vehicleNumber: 1, licensePlate: '51C-12345' })
    expect(created.data).toEqual({ id: 'V1' })
    expect(updated.data.isActive).toBe(false)
  })

  // L1-FES-09 | EP-Invalid | Lỗi từ server phải nổi lên cho caller, không bị nuốt thành { data: undefined }
  it('L1-FES-09 lỗi 4xx/5xx phải ném ra cho caller xử lý', async () => {
    localStorage.setItem('accessToken', 'jwt-1')
    server.use(http.get('/api/vehicles', () =>
      new HttpResponse(JSON.stringify({ message: 'Không có quyền truy cập.' }), { status: 403 })))

    await expect(api.get('/vehicles')).rejects.toThrow('Không có quyền truy cập.')
  })
})
