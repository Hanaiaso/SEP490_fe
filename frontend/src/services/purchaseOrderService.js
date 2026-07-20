import { fetchWithToken, fetchFormDataWithToken } from './authService.js';

export async function getPurchaseOrders(status) {
  const url = status ? `/purchase-orders?status=${status}` : '/purchase-orders';
  return fetchWithToken('GET', url);
}

export async function importPOFromExcel(file) {
  const formData = new FormData();
  formData.append('file', file);
  return fetchFormDataWithToken('POST', '/purchase-orders/import/excel', formData);
}

export async function importPOFromImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  return fetchFormDataWithToken('POST', '/purchase-orders/import/image', formData);
}

export async function getWarehouses() {
  return fetchWithToken('GET', '/purchase-orders/warehouses');
}

export async function getPurchaseOrderById(id) {
  return fetchWithToken('GET', `/purchase-orders/${id}`);
}

export async function createPurchaseOrder(payload) {
  return fetchWithToken('POST', '/purchase-orders', payload);
}

export async function updateDraftPurchaseOrder(id, payload) {
  return fetchWithToken('PUT', `/purchase-orders/${id}`, payload);
}

export async function issuePurchaseOrder(id) {
  return fetchWithToken('POST', `/purchase-orders/${id}/issue`);
}

export async function sendToWarehouse(id) {
  return fetchWithToken('POST', `/purchase-orders/${id}/send-to-warehouse`);
}

export async function cancelPurchaseOrder(id) {
  return fetchWithToken('POST', `/purchase-orders/${id}/cancel`);
}

export async function resolveDiscrepancy(id, payload) {
  return fetchWithToken('POST', `/purchase-orders/${id}/resolve-discrepancy`, payload);
}

export async function closePurchaseOrder(id) {
  return fetchWithToken('POST', `/purchase-orders/${id}/close`);
}

// Goods Receipts

export async function getGoodsReceipts(poId) {
  return fetchWithToken('GET', `/purchase-orders/${poId}/receipts`);
}

export async function createGoodsReceipt(poId, payload) {
  return fetchWithToken('POST', `/purchase-orders/${poId}/receipts`, payload);
}

export async function postGoodsReceipt(poId, receiptId) {
  return fetchWithToken('POST', `/purchase-orders/${poId}/receipts/${receiptId}/post`);
}
