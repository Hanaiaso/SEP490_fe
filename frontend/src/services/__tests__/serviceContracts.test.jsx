import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/msw/server.js'
import * as cartService from '../cartService.js'
import { getOrderTimeline } from '../orderService.js'
import { formatPrice } from '../productService.js'
import { dispatchQuarantine } from '../warehouseService.js'

/**
 * Sheet: FE-Services — L1-FES-04..06 (payload correctness + hàm thuần).
 */
describe('L1-FES · hợp đồng payload của service', () => {
  // L1-FES-04 | EP-Valid | cartService.addItem POST đúng endpoint với body {productId, quantity}
  it('L1-FES-04 addItem gửi đúng body tới POST /api/cart/items', async () => {
    let capturedBody = null
    server.use(
      http.post('/api/cart/items', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ id: 'C1', items: [], totalItems: 2 })
      }),
    )

    const result = await cartService.addItem({ productId: 'P1', quantity: 2 })

    expect(capturedBody).toEqual({ productId: 'P1', quantity: 2 })
    expect(result.totalItems).toBe(2)
  })

  // L1-FES-05 | EP-Valid | getOrderTimeline map trạng thái sang danh sách bước theo đúng thứ tự
  it('L1-FES-05 getOrderTimeline đánh dấu đúng các bước đã qua khi đang giao hàng', () => {
    const steps = getOrderTimeline('Processing', 'InDelivery')

    expect(steps.map((s) => s.title)).toEqual([
      'Đơn hàng mới',
      'Đã tiếp nhận',
      'Đang đóng gói',
      'Đang giao hàng',
      'Giao thành công',
    ])
    expect(steps.slice(0, 4).every((s) => s.done)).toBe(true)
    expect(steps[4].done).toBe(false) // 'Giao thành công' chưa được kích hoạt
  })

  it('L1-FES-05 getOrderTimeline đánh dấu đủ 5 bước khi đơn đã hoàn thành', () => {
    const steps = getOrderTimeline('Completed', 'Delivered')

    expect(steps.every((s) => s.done)).toBe(true)
  })

  // L1-FES-06 | EP-Valid | formatPrice render VND theo locale vi-VN
  it('L1-FES-06 formatPrice render tiền VND đúng định dạng vi-VN', () => {
    const formatted = formatPrice(9999999)

    // Khẳng định theo ĐỊNH DẠNG CHÍNH TẮC hiện tại của dự án (Intl vi-VN, currency VND):
    // có ký hiệu ₫, dùng dấu chấm phân tách hàng nghìn, không có phần thập phân.
    expect(formatted).toContain('₫')
    expect(formatted.replace(/\s| /g, '')).toContain('9.999.999')
    expect(formatted).not.toContain(',00')
  })

  // L1-FES-10 | EP-Valid | P0-2 regression: BE (QuarantineDispatchDto) doc field "action", khong phai
  // "decision" -- truoc day lech ten khien quyet dinh "damaged" luon bi model binder bo qua va mac dinh
  // ve "available". Test nay khoa body request lai dung { action } de chan tai phat.
  it('L1-FES-10 dispatchQuarantine gui dung body { action } toi POST /api/warehouse-management/quarantine/:id/dispatch', async () => {
    let capturedBody = null
    server.use(
      http.post('/api/warehouse-management/quarantine/Q1/dispatch', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ message: 'ok' })
      }),
    )

    await dispatchQuarantine('Q1', 'damaged')

    expect(capturedBody).toEqual({ action: 'damaged' })
    expect(capturedBody).not.toHaveProperty('decision')
  })
})
