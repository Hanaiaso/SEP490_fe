import { fetchWithToken } from './authService.js';

/**
 * Danh sách chuyến giao hàng (Nhóm C — chuyến theo xe/ca/ngày), lọc theo ngày/trạng thái (tuỳ chọn).
 * @param {{ date?: string, status?: string }} [params]
 */
export async function getDeliveryTrips(params = {}) {
  const qs = new URLSearchParams();
  if (params.date) qs.set('date', params.date);
  if (params.status) qs.set('status', params.status);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return fetchWithToken('GET', `/delivery/trips${suffix}`);
}

export async function getDeliveryTripById(id) {
  return fetchWithToken('GET', `/delivery/trips/${id}`);
}

/**
 * @param {{ vehicleId: string, shift: string, tripDate: string, orderIds: string[] }} payload
 */
export async function createDeliveryTrip(payload) {
  return fetchWithToken('POST', '/delivery/trips', payload);
}

/**
 * Bắt đầu bốc hàng lên xe (Scheduled -> Loading), có thể nhập kèm giờ xuất phát/đến dự kiến.
 * @param {string} id
 * @param {{ plannedDepartureAt?: string, plannedArrivalAt?: string }} [payload]
 */
export async function startLoadingTrip(id, payload = {}) {
  return fetchWithToken('POST', `/delivery/trips/${id}/start-loading`, payload);
}

/** @param {string} id @param {string[]} orderIds */
export async function addOrdersToTrip(id, orderIds) {
  return fetchWithToken('POST', `/delivery/trips/${id}/orders`, { orderIds });
}

export async function removeOrderFromTrip(id, orderId) {
  return fetchWithToken('DELETE', `/delivery/trips/${id}/orders/${orderId}`);
}

/** Xuất phát (Loading -> InDelivery) — yêu cầu mọi đơn đã bàn giao xác nhận kép. */
export async function startTrip(id) {
  return fetchWithToken('POST', `/delivery/trips/${id}/start`);
}

/**
 * Số việc chờ xử lý cho từng mục con "Giao hàng" ở sidebar Sales (badge) — cho Sale thấy trực
 * quan chỗ nào có việc cần làm mà không phải mở từng trang.
 * @returns {Promise<{pendingHandover:number, warehouseCoordPending:number, tripsPending:number, arrangementPending:number, collectionPending:number}>}
 */
export async function getSalesDeliverySidebarCounts() {
  return fetchWithToken('GET', '/delivery/sales-sidebar-counts');
}
