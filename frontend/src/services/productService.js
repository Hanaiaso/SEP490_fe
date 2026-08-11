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

/**
 * Lấy danh sách sản phẩm cho trang quản lý (CEO/Admin) - bao gồm cả sản phẩm ngừng kinh doanh.
 * @param {{ page?, pageSize?, categoryId?, search?, isDiscontinued? }} params
 * @returns {Promise<{ items, totalCount, page, pageSize, totalPages }>}
 */
export async function getProductsForManagement({ page = 1, pageSize = 12, categoryId, search, isDiscontinued } = {}) {
  const params = new URLSearchParams({ page, pageSize })
  if (categoryId)               params.set('categoryId', categoryId)
  if (search)                   params.set('search', search)
  if (isDiscontinued !== undefined && isDiscontinued !== null) params.set('isDiscontinued', isDiscontinued)
  return request('GET', `/products/management?${params.toString()}`)
}

/**
 * Cập nhật sản phẩm.
 * @param {string} id
 * @param {{ name, sku, standardListedPrice, categoryId, unit, isDiscontinued } | FormData} data
 */
export async function updateProduct(id, data) {
  return request('PUT', `/products/${id}`, data)
}

/**
 * Xóa (ngừng kinh doanh) sản phẩm.
 * @param {string} id
 */
export async function deleteProduct(id) {
  return request('DELETE', `/products/${id}`)
}

/**
 * Thống kê bán hàng theo sản phẩm: tổng quan, top bán chạy, top bán chậm.
 * @param {{ from?: string, to?: string }} params
 */
export async function getProductStats({ from, to } = {}) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to)   params.set('to', to)
  const qs = params.toString()
  return request('GET', `/products/stats${qs ? `?${qs}` : ''}`)
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
