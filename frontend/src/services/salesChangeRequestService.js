import { fetchFormDataWithToken } from './authService'

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

// ─── LUỒNG 7: Khách hàng yêu cầu đổi Sale phụ trách (WF-07; CUS-11, MGR-06) ──

// ─── Customer ────────────────────────────────────────────────────────────────

/** Sale phụ trách hiện tại của khách đang đăng nhập */
export async function getMyAssignedSale() {
  return request('GET', '/sales-change-requests/my-assigned-sale')
}

/** Danh sách Sale để khách chọn Sale mong muốn */
export async function getSalesOptions() {
  return request('GET', '/sales-change-requests/sales-options')
}

/**
 * Tạo yêu cầu đổi Sale (multipart).
 * @param {{ reason: string, problemDescription: string, desiredSalesStaffId?: string, files?: File[] }} payload
 */
export async function createSalesChangeRequest(payload) {
  const fd = new FormData()
  fd.append('Reason', payload.reason)
  fd.append('ProblemDescription', payload.problemDescription)
  if (payload.desiredSalesStaffId) fd.append('DesiredSalesStaffId', payload.desiredSalesStaffId)
  if (payload.files?.length) {
    for (const file of payload.files) fd.append('Files', file)
  }
  return fetchFormDataWithToken('POST', '/sales-change-requests', fd)
}

/** Danh sách yêu cầu của khách đang đăng nhập */
export async function getMyRequests() {
  return request('GET', '/sales-change-requests/mine')
}

/** Hủy yêu cầu đang mở */
export async function cancelRequest(id) {
  return request('PUT', `/sales-change-requests/${id}/cancel`)
}

/** Gửi thông tin bổ sung khi Manager yêu cầu */
export async function submitAdditionalInfo(id, info) {
  return request('PUT', `/sales-change-requests/${id}/additional-info`, { info })
}

// ─── Sales Staff (Sale hiện tại) ─────────────────────────────────────────────

/** Các yêu cầu đổi Sale liên quan tới Sale đang đăng nhập */
export async function getRequestsAboutMe() {
  return request('GET', '/sales-change-requests/about-me')
}

/**
 * Gửi giải trình của Sale hiện tại (multipart — kèm file đính kèm).
 * @param {string} id
 * @param {{ explanation: string, files?: File[] }} payload
 */
export async function submitExplanation(id, payload) {
  const fd = new FormData()
  fd.append('Explanation', payload.explanation)
  if (payload.files?.length) {
    for (const file of payload.files) fd.append('Files', file)
  }
  return fetchFormDataWithToken('PUT', `/sales-change-requests/${id}/explanation`, fd)
}

// ─── Sales Manager ───────────────────────────────────────────────────────────

/**
 * Danh sách yêu cầu (phân trang, lọc status).
 * @param {{ page?: number, pageSize?: number, status?: string }} params
 */
export async function getManagerList(params = {}) {
  const qs = new URLSearchParams()
  if (params.page)     qs.set('page',     String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))
  if (params.status)   qs.set('status',   params.status)

  const query = qs.toString()
  return request('GET', `/sales-change-requests${query ? `?${query}` : ''}`)
}

/** Gate bảo vệ khách: Manager mở giải trình thì Sale hiện tại mới thấy được khiếu nại */
export async function requestExplanation(id) {
  return request('PUT', `/sales-change-requests/${id}/request-explanation`)
}

/** Chi tiết yêu cầu */
export async function getRequestDetail(id) {
  return request('GET', `/sales-change-requests/${id}`)
}

/** Dữ liệu rà soát: đơn đang chạy của khách + workload các Sale */
export async function getReviewContext(id) {
  return request('GET', `/sales-change-requests/${id}/review-context`)
}

/** Yêu cầu khách bổ sung thông tin */
export async function requestMoreInfo(id, note) {
  return request('PUT', `/sales-change-requests/${id}/request-info`, { note })
}

/** Từ chối yêu cầu (bắt buộc có lý do) */
export async function rejectRequest(id, note) {
  return request('PUT', `/sales-change-requests/${id}/reject`, { note })
}

/**
 * Phê duyệt: chỉ định Sale mới + quyết định giữ/chuyển từng đơn đang chạy.
 * @param {string} id
 * @param {{ newSalesStaffId: string, overrideReason?: string, orderDecisions: Array<{ orderId: string, transferToNewSale: boolean, note?: string }> }} payload
 */
export async function approveRequest(id, payload) {
  return request('PUT', `/sales-change-requests/${id}/approve`, payload)
}
