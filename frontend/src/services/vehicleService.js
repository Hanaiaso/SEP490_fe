import { fetchWithToken } from './authService.js';

/**
 * Danh sách xe giao hàng (đọc mở cho mọi user đã đăng nhập).
 */
export async function getVehicles() {
  return fetchWithToken('GET', '/vehicles');
}

/**
 * Tạo xe mới (Admin).
 * @param {{ vehicleNumber: number, licensePlate: string, capacity?: number, note?: string }} payload
 */
export async function createVehicle(payload) {
  return fetchWithToken('POST', '/vehicles', payload);
}

/**
 * Cập nhật xe (Admin). Lưu ý: vehicleNumber không thể sửa sau khi tạo.
 * @param {string} id
 * @param {{ licensePlate: string, capacity?: number, isActive: boolean, note?: string }} payload
 */
export async function updateVehicle(id, payload) {
  return fetchWithToken('PUT', `/vehicles/${id}`, payload);
}
