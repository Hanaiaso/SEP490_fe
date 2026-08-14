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

/**
 * Dashboard tổng quan Warehouse Staff (KPI xuất/nhập/tồn kho toàn kho).
 */
export async function getWarehouseStaffDashboard() {
  return fetchWithToken('GET', '/dashboards/warehouse-staff');
}

/**
 * Dashboard tổng quan Admin (doanh thu, đơn hàng theo trạng thái, tồn kho, top sản phẩm/khách hàng).
 * @param {{ from?: string, to?: string }} [range]
 */
export async function getAdminDashboard(range = {}) {
  const qs = buildQuery(range);
  return fetchWithToken('GET', `/dashboards/admin${qs ? `?${qs}` : ''}`);
}

/**
 * [Sales Manager] Danh sách toàn bộ Sales Staff kèm mục tiêu doanh thu + doanh thu thực tế của 1 tháng.
 * @param {{ year?: number, month?: number }} [period] mặc định tháng hiện tại
 */
export async function getSalesTeamTargets(period = {}) {
  const params = new URLSearchParams();
  if (period.year) params.set('year', String(period.year));
  if (period.month) params.set('month', String(period.month));
  const qs = params.toString();
  return fetchWithToken('GET', `/sales-targets${qs ? `?${qs}` : ''}`);
}

/**
 * [Sales Manager] Đặt/cập nhật mục tiêu doanh thu tháng cho 1 Sales Staff.
 * @param {{ salesStaffId: string, year: number, month: number, targetAmount: number }} payload
 */
export async function setSalesTarget(payload) {
  return fetchWithToken('POST', '/sales-targets', payload);
}
