// ─── Base config ─────────────────────────────────────────────────────────────
import { API_BASE_URL as API_BASE } from '../config/api'

async function request(method, url, body) {
  const accessToken = localStorage.getItem('accessToken')

  const headers = { 'Content-Type': 'application/json' }
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  // Một số delete endpoint trả về status 200/204 không có body hoặc có body rỗng
  const text = await res.text()
  const json = text ? JSON.parse(text) : {}

  if (!res.ok) {
    throw new Error(json.message || `Lỗi ${res.status}`)
  }

  return json;
}

// ─── Cart endpoints ──────────────────────────────────────────────────────────

/**
 * Lấy giỏ hàng của người dùng hiện tại (yêu cầu đăng nhập).
 * @returns {Promise<{ id, customerProfileId, updatedAt, items: [], totalItems, totalPrice }>}
 */
export async function getCart() {
  return request('GET', '/cart')
}

/**
 * Thêm sản phẩm vào giỏ hàng.
 * @param {{ productId: string, quantity: number }} data
 * @returns {Promise<any>}
 */
export async function addItem(data) {
  return request('POST', '/cart/items', data)
}

/**
 * Cập nhật số lượng của một sản phẩm trong giỏ hàng.
 * @param {string} cartItemId
 * @param {{ quantity: number }} data
 * @returns {Promise<any>}
 */
export async function updateItem(cartItemId, data) {
  return request('PUT', `/cart/items/${cartItemId}`, data)
}

/**
 * Xóa một sản phẩm khỏi giỏ hàng.
 * @param {string} cartItemId
 * @returns {Promise<any>}
 */
export async function removeItem(cartItemId) {
  return request('DELETE', `/cart/items/${cartItemId}`)
}

/**
 * Xóa toàn bộ giỏ hàng.
 * @returns {Promise<any>}
 */
export async function clearCart() {
  return request('DELETE', '/cart')
}
