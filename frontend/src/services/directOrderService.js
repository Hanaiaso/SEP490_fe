import { authFetch } from './httpClient';

async function request(method, url, body) {
  const headers = {};
  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await authFetch(url, {
    method,
    headers,
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  });

  if (res.status === 204) {
    return null;
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errors = json.errors && typeof json.errors === 'object' ? Object.values(json.errors).flat().join(' ') : '';
    throw new Error(json.message || json.detail || errors || `Lỗi ${res.status}`);
  }

  return json;
}

/**
 * Đặt đơn hàng trực tiếp tại quầy và lưu hóa đơn PDF.
 * @param {object} orderData Dữ liệu đơn hàng
 * @returns {Promise<object>} Response chứa OrderId, OrderCode, FinalPayment, InvoicePdfUrl
 */
export async function placeDirectOrder(orderData) {
  return request('POST', '/orders/place-direct-order', orderData);
}
