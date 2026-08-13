// ─── Base config ─────────────────────────────────────────────────────────────
import { API_BASE } from './apiBase';

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

/**
 * BR-025: xác nhận làm mới giá cho giỏ hàng đã hết hạn giữ giá 24h (isPriceExpired = true).
 * @returns {Promise<any>}
 */
export async function refreshPrices() {
  return request('POST', '/cart/refresh-price')
}

// ─── Giỏ hàng tạm cho khách chưa đăng nhập (localStorage) ────────────────────
const GUEST_CART_KEY = 'guestCart'

export function getGuestCartItems() {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY)
    const items = raw ? JSON.parse(raw) : []
    return Array.isArray(items) ? items : []
  } catch {
    return []
  }
}

function saveGuestCartItems(items) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items))
  return items
}

/**
 * Thêm sản phẩm vào giỏ hàng tạm.
 * @param {{ id: string, name: string, imageUrl?: string, price: number }} product
 * @param {number} quantity
 */
export function addGuestCartItem(product, quantity) {
  const items = getGuestCartItems()
  const existing = items.find((i) => i.productId === product.id)
  if (existing) {
    existing.quantity += quantity
  } else {
    items.push({
      id: product.id,
      productId: product.id,
      productName: product.name,
      imageUrl: product.imageUrl,
      quantity,
      unitPrice: product.price,
    })
  }
  return saveGuestCartItems(items)
}

export function updateGuestCartItem(productId, quantity) {
  const items = getGuestCartItems()
  const existing = items.find((i) => i.productId === productId)
  if (existing) existing.quantity = quantity
  return saveGuestCartItems(items)
}

export function removeGuestCartItem(productId) {
  const items = getGuestCartItems().filter((i) => i.productId !== productId)
  return saveGuestCartItems(items)
}

export function clearGuestCartItems() {
  localStorage.removeItem(GUEST_CART_KEY)
  return []
}

/**
 * Dựng object giống CartDto từ backend để CartContext/Cart.jsx dùng chung logic.
 * @param {Array} items
 */
export function buildGuestCartDto(items) {
  return {
    items,
    totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
    totalPrice: items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    updatedAt: new Date().toISOString(),
  }
}
