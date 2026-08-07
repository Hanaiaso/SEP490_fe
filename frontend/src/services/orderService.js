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

export async function requestCancelOrder(orderId, body) {
  return request('POST', `/orders/${orderId}/request-cancel`, body)
}

export async function processCancelRequest(orderId, body) {
  return request('POST', `/orders/sales/${orderId}/process-cancel-request`, body)
}

// ─── Order History ────────────────────────────────────────────────────────────

/**
 * Lấy danh sách lịch sử đơn hàng của Customer đang đăng nhập.
 * @param {{ search?: string, status?: string, paymentStatus?: string,
 *           fromDate?: string, toDate?: string, page?: number, pageSize?: number }} params
 * @returns {Promise<{ items, totalCount, page, pageSize, totalPages }>}
 */
export async function getOrderHistory(params = {}) {
  const qs = new URLSearchParams()
  if (params.search) qs.set('search', params.search)
  if (params.status) qs.set('status', params.status)
  if (params.paymentStatus) qs.set('paymentStatus', params.paymentStatus)
  if (params.fromDate) qs.set('fromDate', params.fromDate)
  if (params.toDate) qs.set('toDate', params.toDate)
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))

  const query = qs.toString()
  return request('GET', `/orders/my-history${query ? `?${query}` : ''}`)
}

/**
 * Lấy chi tiết 1 đơn hàng của Customer đang đăng nhập.
 * @param {string} orderId – UUID của đơn hàng
 * @returns {Promise<OrderHistoryDetailDto>}
 */
export async function getOrderDetail(orderId) {
  return request('GET', `/orders/my-history/${orderId}`)
}

export async function trackOrderPublic(queryStr) {
  return request('GET', `/orders/track?query=${encodeURIComponent(queryStr)}`)
}

/**
 * Lấy số liệu thống kê chi tiêu cá nhân của Customer đang đăng nhập.
 * @param {'week'|'month'|'quarter'|'year'} period
 * @returns {Promise<{ totalOrders, totalSpent, topProductName, vatInvoiceCount,
 *                      spendingByMonth: {label,value}[], topProducts: {name,value}[] }>}
 */
export async function getSpendingStats(period = 'month') {
  return request('GET', `/orders/my-stats?period=${encodeURIComponent(period)}`)
}

/**
 * Yêu cầu hóa đơn VAT cho đơn hàng đã giao.
 * @param {string} orderId – UUID của đơn hàng
 * @returns {Promise<{ message: string }>}
 */
export async function requestVatInvoice(orderId) {
  return request('POST', `/orders/${orderId}/request-vat`)
}

/**
 * Tải PDF hóa đơn – mở URL trực tiếp trong tab mới.
 * @param {string | null | undefined} invoicePdfUrl
 */
export function downloadInvoicePdf(invoicePdfUrl) {
  if (!invoicePdfUrl) throw new Error('Hóa đơn PDF chưa sẵn sàng.')
  window.open(invoicePdfUrl, '_blank', 'noopener,noreferrer')
}

// ─── Status Metadata ─────────────────────────────────────────────────────────

export const orderStatusMeta = {
  Draft: { label: 'Đơn nháp', badgeClass: 'bg-gray-100 text-gray-700' },
  PendingPayment: { label: 'Chờ thanh toán', badgeClass: 'bg-amber-100 text-amber-700' },
  PendingConfirmation: { label: 'Chờ xác nhận', badgeClass: 'bg-blue-100 text-blue-700' },
  Confirmed: { label: 'Đã xác nhận', badgeClass: 'bg-indigo-100 text-indigo-700' },
  Processing: { label: 'Đang xử lý', badgeClass: 'bg-violet-100 text-violet-700' },
  Packing: { label: 'Đang đóng gói', badgeClass: 'bg-violet-100 text-violet-700' },
  Completed: { label: 'Đã hoàn thành', badgeClass: 'bg-emerald-100 text-emerald-700' },
  CancelRequested: { label: 'Chờ hủy đơn', badgeClass: 'bg-orange-100 text-orange-700' },
  CancelledReallocated: { label: 'Đã hủy & cấn trừ', badgeClass: 'bg-red-100 text-red-600' },
  Cancelled: { label: 'Đã hủy', badgeClass: 'bg-red-100 text-red-600' },
  PaidReviewRequired: { label: 'Cần duyệt TT', badgeClass: 'bg-purple-100 text-purple-700' },
  Returned: { label: 'Đã đổi/trả', badgeClass: 'bg-teal-100 text-teal-700' },
  New: { label: 'Đơn mới', badgeClass: 'bg-blue-100 text-blue-700' },
  Received: { label: 'Đã tiếp nhận', badgeClass: 'bg-indigo-100 text-indigo-700' },
  Shortage: { label: 'Thiếu hàng', badgeClass: 'bg-orange-100 text-orange-700' },
  InTransit: { label: 'Đang giao', badgeClass: 'bg-amber-100 text-amber-700' },
  Delivered: { label: 'Đã giao', badgeClass: 'bg-emerald-100 text-emerald-700' },
}

export const paymentStatusMeta = {
  Unpaid: { label: 'Chưa TT', badgeClass: 'bg-rose-100 text-rose-700' },
  Pending: { label: 'Chờ TT', badgeClass: 'bg-amber-100 text-amber-700' },
  Paid: { label: 'Đã TT', badgeClass: 'bg-emerald-100 text-emerald-700' },
  PartiallyPaid: { label: 'TT 1 phần', badgeClass: 'bg-blue-100 text-blue-700' },
  Failed: { label: 'TT thất bại', badgeClass: 'bg-red-100 text-red-600' },
  Refunded: { label: 'Đã hoàn tiền', badgeClass: 'bg-purple-100 text-purple-700' },
}

export const redInvoiceStatusMeta = {
  None: { label: 'Chưa yêu cầu', badgeClass: 'bg-gray-100 text-gray-500' },
  Pending: { label: 'Đang xử lý', badgeClass: 'bg-amber-100 text-amber-700' },
  Issued: { label: 'Đã phát hành', badgeClass: 'bg-blue-100 text-blue-700' },
  SentToCustomer: { label: 'Đã gửi', badgeClass: 'bg-emerald-100 text-emerald-700' },
}

/**
 * Map OrderStatus sang các bước timeline hiển thị
 * @param {string} orderStatus
 * @param {string} [deliveryStatus]
 * @returns {{ title: string, done: boolean }[]}
 */
export function getOrderTimeline(orderStatus, deliveryStatus) {
  let progressIdx = 0;

  if (orderStatus === 'Completed' || deliveryStatus === 'Delivered' || orderStatus === 'Returned') {
    progressIdx = 4;
  } else if (deliveryStatus === 'InDelivery' || deliveryStatus === 'Rescheduled' || orderStatus === 'InTransit') {
    progressIdx = 3;
  } else if (orderStatus === 'Processing' || orderStatus === 'Packing' || deliveryStatus === 'Scheduled') {
    progressIdx = 2;
  } else if (orderStatus === 'Confirmed' || orderStatus === 'Received' || orderStatus === 'PaidReviewRequired') {
    progressIdx = 1;
  } else {
    progressIdx = 0; // Draft, New, PendingPayment, PendingConfirmation
  }

  const steps = [
    { key: 'New', title: 'Đơn hàng mới' },
    { key: 'Received', title: 'Đã tiếp nhận' },
    { key: 'Packing', title: 'Đang đóng gói' },
    { key: 'InTransit', title: 'Đang giao hàng' },
    { key: 'Delivered', title: orderStatus === 'Returned' ? 'Đã hoàn thành Đổi/Trả' : 'Giao thành công' },
  ]

  return steps.map((step, idx) => ({
    ...step,
    done: idx <= progressIdx,
  }))
}

export async function createExchangeRequest(orderId, data) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`/api/orders/${orderId}/exchange-request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Lỗi khi tạo yêu cầu đổi/trả hàng.');
  }
  return res.json();
}

export async function processReturnExchangeRequest(id, data) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`/api/orders/exchange-request/${id}/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Lỗi xử lý yêu cầu đổi/trả.');
  }
  return res.json();
}
