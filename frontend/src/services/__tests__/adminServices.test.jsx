import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/msw/server.js'
import * as discountTierService from '../discountTierService.js'
import * as vehicleService from '../vehicleService.js'

/**
 * Sheet: FE-Services — ⊕ v2.3 (L1-FES-10, L1-FES-11).
 * Bổ sung sau rà soát 01/08/2026: 2 service này đi kèm 2 trang Admin mới nhưng chưa có test.
 * Trọng tâm: HỢP ĐỒNG với backend — đúng endpoint, đúng method, body không bị biến dạng.
 */
describe('L1-FES-10 · discountTierService', () => {
  beforeEach(() => localStorage.setItem('accessToken', 'jwt-1'))

  // L1-FES-10 | EP-Valid | Gọi đúng endpoint Admin
  it('L1-FES-10 getDiscountTiers gọi GET /api/admin/discount-tiers', async () => {
    let hit = 0
    server.use(http.get('/api/admin/discount-tiers', () => {
      hit += 1
      return HttpResponse.json([{ id: 'T1', minAmount: 10000000, discountPercent: 0.05 }])
    }))

    const tiers = await discountTierService.getDiscountTiers()

    expect(hit).toBe(1)
    expect(tiers[0].discountPercent).toBe(0.05)
  })

  // L1-FES-10 | EP-Valid | discountPercent phải giữ nguyên dạng PHÂN SỐ 0..1 (0.05 = 5%),
  // không được nhân/chia 100 ở tầng service — BE validate Range(0,1) nên gửi 5 sẽ bị từ chối.
  it('L1-FES-10 createDiscountTier gửi discountPercent dạng phân số, không nhân 100', async () => {
    let body = null
    server.use(http.post('/api/admin/discount-tiers', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ id: 'T2', ...body })
    }))

    await discountTierService.createDiscountTier({
      minAmount: 10_000_000,
      maxAmount: 50_000_000,
      discountPercent: 0.05,
      description: 'Bậc 1',
    })

    expect(body).toEqual({
      minAmount: 10_000_000,
      maxAmount: 50_000_000,
      discountPercent: 0.05,
      description: 'Bậc 1',
    })
    expect(body.discountPercent).toBeLessThanOrEqual(1)
  })

  // L1-FES-10 | EP-Valid | Update gắn id vào URL, không nhét vào body
  it('L1-FES-10 updateDiscountTier gọi PUT kèm id trên URL', async () => {
    let hitUrl = null
    server.use(http.put('/api/admin/discount-tiers/:id', ({ params }) => {
      hitUrl = params.id
      return HttpResponse.json({ id: params.id })
    }))

    await discountTierService.updateDiscountTier('T1', {
      minAmount: 10_000_000, discountPercent: 0.06, isActive: true,
    })

    expect(hitUrl).toBe('T1')
  })
})

describe('L1-FES-11 · vehicleService', () => {
  beforeEach(() => localStorage.setItem('accessToken', 'jwt-1'))

  // L1-FES-11 | EP-Valid | Lấy danh sách xe
  it('L1-FES-11 getVehicles gọi GET /api/vehicles', async () => {
    server.use(http.get('/api/vehicles', () => HttpResponse.json([
      { id: 'V1', vehicleNumber: 1, licensePlate: '51C-12345', isActive: true },
      { id: 'V2', vehicleNumber: 2, licensePlate: '51C-67890', isActive: false },
    ])))

    const vehicles = await vehicleService.getVehicles()

    expect(vehicles).toHaveLength(2)
    expect(vehicles.filter((v) => v.isActive)).toHaveLength(1)
  })

  // L1-FES-11 | EP-Valid | Tạo xe gửi đủ trường bắt buộc
  it('L1-FES-11 createVehicle gửi đúng payload', async () => {
    let body = null
    server.use(http.post('/api/vehicles', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ id: 'V3', ...body })
    }))

    await vehicleService.createVehicle({ vehicleNumber: 3, licensePlate: '51C-11111', capacity: 2000 })

    expect(body).toEqual({ vehicleNumber: 3, licensePlate: '51C-11111', capacity: 2000 })
  })

  // L1-FES-11 | EP-Valid | Update KHÔNG được gửi vehicleNumber (BE không cho sửa sau khi tạo)
  it('L1-FES-11 updateVehicle không đính kèm vehicleNumber', async () => {
    let body = null
    server.use(http.put('/api/vehicles/:id', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ id: 'V1' })
    }))

    await vehicleService.updateVehicle('V1', { licensePlate: '51C-12345', isActive: false, note: 'Bảo dưỡng' })

    expect(body).not.toHaveProperty('vehicleNumber', expect.anything())
    expect(body).toEqual({ licensePlate: '51C-12345', isActive: false, note: 'Bảo dưỡng' })
  })
})
