import { fetchWithToken } from './authService.js';

// api/ceo/system-configs — chỉ trả về đúng phần cấu hình CEO cùng sở hữu (OwnerLevel chứa "CEO"),
// không phải toàn bộ danh sách như /admin/system-configs (xem AdminSystemConfigPage.tsx).

export async function getCeoConfigs() {
  return fetchWithToken('GET', '/ceo/system-configs');
}

export async function getCeoConfigHistory(key) {
  return fetchWithToken('GET', `/ceo/system-configs/${key}/history`);
}

export async function updateCeoConfig(key, { value, effectiveDate, reason }) {
  return fetchWithToken('PUT', `/ceo/system-configs/${key}`, { value, effectiveDate, reason });
}
