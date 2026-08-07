import { fetchWithToken } from './authService.js';

/**
 * Danh sách khung chiết khấu (Admin).
 */
export async function getDiscountTiers() {
  return fetchWithToken('GET', '/admin/discount-tiers');
}

/**
 * Tạo khung chiết khấu mới (Admin). discountPercent là phân số 0-1 (0.05 = 5%).
 * @param {{ minAmount: number, maxAmount?: number, discountPercent: number, description?: string }} payload
 */
export async function createDiscountTier(payload) {
  return fetchWithToken('POST', '/admin/discount-tiers', payload);
}

/**
 * Cập nhật khung chiết khấu (Admin).
 * @param {string} id
 * @param {{ minAmount: number, maxAmount?: number, discountPercent: number, isActive: boolean, description?: string }} payload
 */
export async function updateDiscountTier(id, payload) {
  return fetchWithToken('PUT', `/admin/discount-tiers/${id}`, payload);
}
