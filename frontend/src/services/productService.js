// ─── Base config ─────────────────────────────────────────────────────────────
import { API_BASE } from './apiBase';

async function request(method, url, body) {
  const accessToken = localStorage.getItem('accessToken')
  const headers = {}
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const isFormData = body instanceof FormData;
  if (!isFormData && body) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${API_BASE}${url}`, { 
    method,
    headers,
    body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
  })
  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(json.message || `Lỗi ${res.status}`)
  }

  return json
}

// ─── Product endpoints ────────────────────────────────────────────────────────

/**
 * Lấy danh sách sản phẩm có phân trang, lọc và tìm kiếm.
 * @param {{ page?, pageSize?, categoryId?, search? }} params
 * @returns {Promise<{ items, totalCount, page, pageSize, totalPages }>}
 */
export async function getProducts({ page = 1, pageSize = 6, categoryId, search, sortBy } = {}) {
  const params = new URLSearchParams({ page, pageSize })
  if (categoryId) params.set('categoryId', categoryId)
  if (search)     params.set('search', search)
  if (sortBy)     params.set('sortBy', sortBy)
  return request('GET', `/products?${params.toString()}`)
}

/**
 * Lấy chi tiết 1 sản phẩm theo ID (GUID).
 * @param {string} id
 * @returns {Promise<{ id, name, sku, standardListedPrice, description, specifications, imageUrl, categoryId, categoryName, physicalStock, availableStock }>}
 */
export async function getProductById(id) {
  return request('GET', `/products/${id}`)
}

/**
 * Lấy danh sách danh mục đang hoạt động.
 * @returns {Promise<{ id, name, description }[]>}
 */
export async function getCategories() {
  return request('GET', '/products/categories')
}

/**
 * Tạo sản phẩm mới hoàn toàn.
 * @param {{ name, sku, standardListedPrice, categoryId, unit } | FormData} data
 */
export async function createProduct(data) {
  return request('POST', '/products', data)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format số tiền sang định dạng Việt Nam (ví dụ: 125.000 ₫).
 * @param {number} price
 */
export function formatPrice(price) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(price)
}
