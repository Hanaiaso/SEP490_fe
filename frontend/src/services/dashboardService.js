import { fetchWithToken } from './authService.js';

function buildQuery({ from, to } = {}) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return params.toString();
}

/**
 * Dashboard cá nhân Sales Staff (chỉ đơn/khách của chính mình).
 * @param {{ from?: string, to?: string }} [range] ISO datetime, mặc định 30 ngày gần nhất
 */
export async function getSalesStaffDashboard(range = {}) {
  const qs = buildQuery(range);
  return fetchWithToken('GET', `/dashboards/sales-staff${qs ? `?${qs}` : ''}`);
}

/**
 * Dashboard toàn đội Sales Manager.
 * @param {{ from?: string, to?: string }} [range]
 */
export async function getSalesManagerDashboard(range = {}) {
  const qs = buildQuery(range);
  return fetchWithToken('GET', `/dashboards/sales-manager${qs ? `?${qs}` : ''}`);
}

/**
 * Dashboard tổng quan CEO.
 * @param {{ from?: string, to?: string }} [range]
 */
export async function getCeoDashboard(range = {}) {
  const qs = buildQuery(range);
  return fetchWithToken('GET', `/dashboards/ceo${qs ? `?${qs}` : ''}`);
}
