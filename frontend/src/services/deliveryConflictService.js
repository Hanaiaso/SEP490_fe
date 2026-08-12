import { fetchWithToken } from './authService.js';

// UC-34: Sales Manager xử lý xung đột lịch xe/ca

export async function getPendingDeliveryConflicts() {
  return fetchWithToken('GET', '/delivery/conflicts');
}

export async function resolveDeliveryConflict(conflictId, payload) {
  return fetchWithToken('POST', `/delivery/conflicts/${conflictId}/resolve`, payload);
}
