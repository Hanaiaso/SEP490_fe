const API_BASE = '/api';

async function request(method, url, body) {
  const accessToken = localStorage.getItem('accessToken');

  const headers = {};
  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers,
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  });

  if (res.status === 204) {
    return null;
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json.message || json.detail || `Lỗi ${res.status}`);
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
