/**
 * sePayExceptionService.js
 * MGR-05 — Service gọi API xử lý ngoại lệ thanh toán SePay
 * Chỉ dành cho role: SalesManager
 */

const API_BASE = '/api'

async function request(method, url, body) {
  const accessToken = localStorage.getItem('accessToken')
  const headers = { 'Content-Type': 'application/json' }
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null

  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    // Lấy code lỗi từ backend (format { code, message })
    const err = new Error(json.message || `Lỗi ${res.status}`)
    err.code = json.code || 'UNKNOWN_ERROR'
    err.details = json.details
    throw err
  }

  return json
}

/**
 * Lấy danh sách ngoại lệ SePay cần xử lý (dành cho SalesManager).
 * Bao gồm: Pending quá 30 phút + PAID nhưng PAID_REVIEW_REQUIRED
 * @returns {Promise<SePayExceptionItemDto[]>}
 */
export async function getSePayExceptions() {
  return request('GET', '/orders/sepay-exceptions')
}

/**
 * Sales Manager xác nhận thanh toán SePay thủ công.
 * @param {string} orderId - UUID của đơn hàng
 * @param {{ externalTransactionId, actualAmount, evidenceUrl, transferContent?, note? }} payload
 * @returns {Promise<ManualConfirmPaymentResponse>}
 */
export async function manualConfirmPayment(orderId, payload) {
  return request('POST', `/orders/${orderId}/manual-confirm`, payload)
}

/**
 * Sales Manager thử phân bổ lại tồn kho cho đơn PAID nhưng chưa allocation.
 * Điều kiện: PaymentStatus=Paid, OrderStatus=PaidReviewRequired
 * @param {string} orderId - UUID của đơn hàng
 * @param {string} [note] - Ghi chú lý do retry
 * @returns {Promise<ManualConfirmPaymentResponse>}
 */
export async function retryAllocation(orderId, note) {
  return request('POST', `/orders/${orderId}/retry-allocation`, { note })
}
