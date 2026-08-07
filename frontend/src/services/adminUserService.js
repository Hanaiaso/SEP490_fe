import { fetchWithToken } from './authService.js';

// Vai trò Admin được phép gán (không bao gồm Customer/Guest — tạo qua luồng đăng ký công khai).
export const ASSIGNABLE_ROLES = ['SalesStaff', 'SalesManager', 'WarehouseStaff', 'AccountingStaff', 'CEO', 'Admin'];

/**
 * Tìm kiếm/lọc danh sách người dùng (Admin).
 * @param {{ page?: number, pageSize?: number, searchQuery?: string, role?: string, isActive?: string|boolean }} [params]
 */
export async function searchUsers({ page = 1, pageSize = 20, searchQuery, role, isActive } = {}) {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('pageSize', pageSize);
  if (searchQuery) params.set('searchQuery', searchQuery);
  if (role) params.set('role', role);
  if (isActive !== undefined && isActive !== null && isActive !== '') params.set('isActive', isActive);
  return fetchWithToken('GET', `/admin/users?${params.toString()}`);
}

export async function getUserById(id) {
  return fetchWithToken('GET', `/admin/users/${id}`);
}

export async function createUser(payload) {
  return fetchWithToken('POST', '/admin/users', payload);
}

export async function changeUserRole(id, { newRole, reason }) {
  return fetchWithToken('PUT', `/admin/users/${id}/role`, { newRole, reason });
}

export async function setUserStatus(id, { isActive, reason }) {
  return fetchWithToken('PUT', `/admin/users/${id}/status`, { isActive, reason });
}
