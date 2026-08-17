import { authFetch } from './httpClient';

async function request(method, url, body) {
  const res = await authFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json.message || `Lỗi ${res.status}`);
  }

  return json;
}

export async function getWarehouseOrders(tabType, pageNumber = 1, pageSize = 10) {
  return request('GET', `/warehouse/orders?tabType=${tabType}&pageNumber=${pageNumber}&pageSize=${pageSize}`);
}

export async function getWarehouseOrderDetail(orderId) {
  return request('GET', `/warehouse/orders/${orderId}/detail`);
}

export async function acceptWarehouseOrder(orderId) {
  return request('POST', `/warehouse/orders/${orderId}/accept`);
}

export async function consolidateWarehouseOrder(orderId) {
  return request('POST', `/warehouse/orders/${orderId}/consolidate`);
}

export async function handoverWarehouseOrder(orderId, warehouseSignature, salesSignature) {
  return request('POST', `/warehouse/orders/${orderId}/handover`, { 
    warehouseSignature: warehouseSignature || null, 
    salesSignature: salesSignature || null 
  });
}

export async function postGoodsIssueWarehouseOrder(orderId) {
  return request('POST', `/warehouse/orders/${orderId}/goods-issue`);
}

export async function reportShortage(orderId, data) {
  return request('POST', `/warehouse/orders/${orderId}/shortage-alert`, data);
}

// ─── Advanced Warehouse (v6.0) ───────────────────────────────────────────────

export async function getPickTasks(tabType = 'InProgress', pageNumber = 1, pageSize = 50) {
  return request('GET', `/warehouse/orders/pick-tasks?tabType=${tabType}&pageNumber=${pageNumber}&pageSize=${pageSize}`);
}

export async function getPickTaskById(id) {
  return request('GET', `/warehouse/orders/pick-tasks/${id}/detail`);
}

export async function acceptPickTask(id) {
  return request('POST', `/warehouse/orders/pick-tasks/${id}/accept`);
}

export async function completePickTask(id) {
  return request('POST', `/warehouse/orders/pick-tasks/${id}/complete`);
}

export async function updateItemPickProgress(pickTaskId, productId, packedQty, imageFile) {
  const formData = new FormData();
  formData.append('packedQty', packedQty);
  if (imageFile) formData.append('imageFile', imageFile);

  const res = await authFetch(`/warehouse/orders/pick-tasks/${pickTaskId}/items/${productId}/pick-progress`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Lỗi ${res.status}`);
  }
  return res.json();
}

export async function getStockTransfers(status) {
  return request('GET', `/stock-transfers?status=${status || ''}`);
}

export async function getStockTransferById(id) {
  return request('GET', `/stock-transfers/${id}`);
}

export async function createStockTransfer(data) {
  return request('POST', `/stock-transfers`, data);
}

export async function dispatchStockTransfer(id) {
  return request('POST', `/stock-transfers/${id}/dispatch`);
}

export async function cancelStockTransfer(id) {
  return request('POST', `/stock-transfers/${id}/cancel`);
}

export async function requestStockTransferTransport(id) {
  return request('POST', `/stock-transfers/${id}/request-transport`);
}

// ─── Goods Issue ───────────────────────────────────────────────

export async function getGoodsIssues(type) {
  return request('GET', `/goods-issues?type=${type || ''}`);
}

export async function createGoodsIssue(data) {
  return request('POST', `/goods-issues`, data);
}

export async function uploadGoodsIssueProof(id, imageFile) {
  const formData = new FormData();
  formData.append('file', imageFile);

  const res = await authFetch(`/goods-issues/${id}/upload-proof`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || `Lỗi ${res.status}`);
  }
  return res.json();
}

export async function postGoodsIssue(id) {
  return request('POST', `/goods-issues/${id}/post`);
}

export async function updateGoodsIssueHandover(id, data) {
  return request('PUT', `/goods-issues/${id}/handover`, data);
}

export async function createGoodsIssueReversal(id, data) {
  return request('POST', `/goods-issues/${id}/reversal`, data);
}

export async function receiveStockTransfer(id, formData) {
  const res = await authFetch(`/stock-transfers/${id}/receive`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Lỗi ${res.status}`);
  }
  return res.json();
}

export async function getGoodsIssueById(id) {
  return request('GET', `/goods-issues/${id}`);
}

export async function getWarehouseInventory(warehouseId, params) {
  const qs = new URLSearchParams(params).toString();
  return request('GET', `/inventory/${warehouseId}?${qs}`);
}

export async function getLowStockAlerts() {
  return request('GET', `/inventory/low-stock-alerts`);
}

export async function getExcessStockAlerts() {
  return request('GET', `/inventory/excess-stock-alerts`);
}

export async function getInventoryReport(params) {
  const qs = new URLSearchParams(params).toString();
  return request('GET', `/inventory/report${qs ? `?${qs}` : ''}`);
}

export async function getSlowMovingItems(params) {
  const qs = new URLSearchParams(params).toString();
  return request('GET', `/inventory/slow-moving${qs ? `?${qs}` : ''}`);
}

export async function adjustInventory(inventoryId, data) {
  return request('PUT', `/inventory/${inventoryId}/adjust`, data);
}

export async function addInventory(data) {
  return request('POST', `/inventory/add`, data);
}

export async function getWarehouseShifts() {
  return request('GET', `/warehouse-shifts`);
}

export async function createWarehouseShift(data) {
  return request('POST', `/warehouse-shifts`, data);
}

export async function updateWarehouseShift(id, data) {
  return request('PUT', `/warehouse-shifts/${id}`, data);
}

export async function deleteWarehouseShift(id) {
  return request('DELETE', `/warehouse-shifts/${id}`);
}

// ─── P0-1: Đề xuất điều chỉnh tồn kho (Warehouse Staff -> CEO duyệt) ───────────

export async function getStockAdjustments(params) {
  const qs = new URLSearchParams(params || {}).toString();
  return request('GET', `/stock-adjustments${qs ? `?${qs}` : ''}`);
}

export async function getStockAdjustmentById(id) {
  return request('GET', `/stock-adjustments/${id}`);
}

// data: { inventoryId, physicalQuantity, reason }
export async function createStockAdjustment(data) {
  return request('POST', `/stock-adjustments`, data);
}

// data: { decision: 'Approved' | 'Rejected', note }
export async function decideStockAdjustment(id, data) {
  return request('POST', `/stock-adjustments/${id}/decision`, data);
}

// ─── DEF-L4-003: Phiên kiểm kê tồn kho (mở phiên -> chốt số lý thuyết -> đóng phiên = "post") ──

export async function getInventoryCountSessions(params) {
  const qs = new URLSearchParams(params || {}).toString();
  return request('GET', `/inventory-count-sessions${qs ? `?${qs}` : ''}`);
}

export async function getInventoryCountSessionById(id) {
  return request('GET', `/inventory-count-sessions/${id}`);
}

// data: { warehouseId, note? }
export async function openInventoryCountSession(data) {
  return request('POST', `/inventory-count-sessions`, data);
}

// data: { physicalQuantity, note? }
export async function recordInventoryCountItem(sessionId, itemId, data) {
  return request('PUT', `/inventory-count-sessions/${sessionId}/items/${itemId}`, data);
}

export async function closeInventoryCountSession(sessionId) {
  return request('POST', `/inventory-count-sessions/${sessionId}/close`);
}

// ==========================================
// WAREHOUSE MANAGEMENT (CEO)
// ==========================================

export async function getWarehouses() {
  return request('GET', `/warehouse-management`);
}

export async function createWarehouse(data) {
  return request('POST', `/warehouse-management`, data);
}

export async function updateWarehouse(id, data) {
  return request('PUT', `/warehouse-management/${id}`, data);
}

export async function deleteWarehouse(id) {
  return request('DELETE', `/warehouse-management/${id}`);
}

export async function getStaffUsers() {
  return request('GET', `/warehouse-management/staff`);
}

// ==========================================
// QUALITY INSPECTION / QUARANTINE
// ==========================================

export async function getQuarantineList() {
  return request('GET', `/warehouse-management/quarantine`);
}

// P0-2: BE (QuarantineDispatchDto) đọc field "action", không phải "decision" — trước đây lệch tên
// khiến quyết định "damaged" luôn bị bỏ qua và tự động mặc định về "available".
export async function dispatchQuarantine(id, action) {
  return request('POST', `/warehouse-management/quarantine/${id}/dispatch`, { action });
}
