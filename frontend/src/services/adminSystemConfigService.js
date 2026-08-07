import { fetchWithToken } from './authService.js';

export async function getAllConfigs() {
  return fetchWithToken('GET', '/admin/system-configs');
}

export async function getConfigHistory(key) {
  return fetchWithToken('GET', `/admin/system-configs/${key}/history`);
}

export async function updateConfig(key, { value, effectiveDate, reason }) {
  return fetchWithToken('PUT', `/admin/system-configs/${key}`, { value, effectiveDate, reason });
}
