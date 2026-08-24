import { authFetch } from './httpClient';

async function fetchWithToken(method, url, body) {
  const res = await authFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : {};

  if (!res.ok) {
    const errors = json.errors && typeof json.errors === 'object' ? Object.values(json.errors).flat().join(' ') : '';
    throw new Error(json.message || errors || `Lỗi ${res.status}`);
  }
  return json;
}

export async function createFromCart(generalNote) {
  return fetchWithToken('POST', '/Quotation/from-cart', { generalNote });
}

export async function getQuotations() {
  return fetchWithToken('GET', '/Quotation');
}

export async function getQuotationById(id) {
  return fetchWithToken('GET', `/Quotation/${id}`);
}

export async function pickUpQuotation(id) {
  return fetchWithToken('POST', `/Quotation/${id}/pickup`);
}

// Sales Manager phân công thủ công 1 nhân viên Sale cho báo giá ≥100tr thay cho việc Sale tự nhận
// xử lý (pickUpQuotation ở trên nay luôn bị BE từ chối cho mọi báo giá vì tất cả đều ≥100tr).
export async function assignQuotation(id, staffId) {
  return fetchWithToken('POST', `/Quotation/${id}/assign`, { staffId });
}

export async function createVersion(id, payload) {
  return fetchWithToken('POST', `/Quotation/${id}/versions`, payload);
}

export async function managerReview(id, payload) {
  return fetchWithToken('POST', `/Quotation/${id}/manager-decision`, payload);
}

export async function ceoReview(id, payload) {
  return fetchWithToken('POST', `/Quotation/${id}/ceo-decision`, payload);
}

export async function customerDecision(id, payload) {
  return fetchWithToken('POST', `/Quotation/${id}/customer-decision`, payload);
}

export async function cancelQuotation(id) {
  return fetchWithToken('POST', `/Quotation/${id}/cancel`);
}

export async function getMessages(id) {
  return fetchWithToken('GET', `/Quotation/${id}/messages`);
}

export async function sendMessage(id, payload) {
  return fetchWithToken('POST', `/Quotation/${id}/messages`, payload);
}
