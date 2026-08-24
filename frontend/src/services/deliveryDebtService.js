/**
 * deliveryDebtService.js
 * P2-6 (UC-35) — Service gọi API xử lý đơn giao hàng bị khóa & công nợ COD
 * Chỉ dành cho role: SalesManager
 */

import { authFetch } from './httpClient';

async function request(method, url, body) {
  const res = await authFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null

  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    const errors = json.errors && typeof json.errors === 'object' ? Object.values(json.errors).flat().join(' ') : ''
    const err = new Error(json.message || errors || `Lỗi ${res.status}`)
    err.code = json.code || 'UNKNOWN_ERROR'
    throw err
  }

  return json
}

/**
 * Danh sách đơn hàng đang bị khóa do giao thất bại vượt ngưỡng.
 * @returns {Promise<BlockedOrderDto[]>}
 */
export async function getBlockedOrders() {
  return request('GET', '/delivery/blocked-orders')
}

/**
 * Mở khóa đơn hàng để cho phép lên lịch giao lại.
 * @param {string} orderId - UUID của đơn hàng
 * @param {string} reason - Lý do mở khóa (bắt buộc)
 */
export async function unblockOrder(orderId, reason) {
  return request('POST', `/delivery/${orderId}/unblock`, { reason })
}

/**
 * Danh sách công nợ COD.
 * @param {string} [status] - 'InDebt' | 'Settled' (bỏ trống = tất cả)
 * @returns {Promise<CustomerDebtManagementDto[]>}
 */
export async function getDebts(status) {
  return request('GET', `/delivery/debts${status ? `?status=${status}` : ''}`)
}

/**
 * Đánh dấu một khoản công nợ đã được tất toán.
 * @param {string} debtId - UUID của công nợ
 * @param {string} [note] - Ghi chú tất toán (tùy chọn)
 */
export async function settleDebt(debtId, note) {
  return request('POST', `/delivery/debts/${debtId}/settle`, { note })
}
