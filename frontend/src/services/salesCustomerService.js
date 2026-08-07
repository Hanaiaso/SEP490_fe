const API_BASE = '/api'

async function request(method, url, body) {
  const accessToken = localStorage.getItem('accessToken')

  const headers = { 'Content-Type': 'application/json' }
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null

  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(json.message || json.detail || `Lỗi ${res.status}`)
  }

  return json
}

// ─── Khách hàng của tôi (SAL-02) ──────────────────────────────────────────────

/**
 * Danh sách khách hàng được phân bổ cho Sales Staff đang đăng nhập.
 * @param {{ search?: string, page?: number, pageSize?: number }} params
 * @returns {Promise<{ items, totalCount, page, pageSize, totalPages }>}
 */
export async function getMyCustomers(params = {}) {
  const qs = new URLSearchParams()
  if (params.search)   qs.set('search',   params.search)
  if (params.page)     qs.set('page',     String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))

  const query = qs.toString()
  return request('GET', `/sales/my-customers${query ? `?${query}` : ''}`)
}

/**
 * Chi tiết 1 khách hàng (kèm địa chỉ, đơn gần đây, lịch sử phân bổ).
 * @param {string} customerProfileId
 */
export async function getMyCustomerDetail(customerProfileId) {
  return request('GET', `/sales/my-customers/${customerProfileId}`)
}

/**
 * Cập nhật ghi chú của Sale cho khách hàng.
 * @param {string} customerProfileId
 * @param {string|null} note
 */
export async function updateCustomerNote(customerProfileId, note) {
  return request('PUT', `/sales/my-customers/${customerProfileId}/note`, { note })
}
