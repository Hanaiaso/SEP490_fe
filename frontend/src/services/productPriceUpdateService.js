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

// CEO đề xuất đợt cập nhật giá — payload: { scheduledEffectiveDate, proposalNote, items: [{ productId, newPrice }] }
export async function proposeOrder(payload) {
  return fetchWithToken('POST', '/product-price-update-orders', payload);
}

export async function getOrders() {
  return fetchWithToken('GET', '/product-price-update-orders');
}

export async function getOrderById(id) {
  return fetchWithToken('GET', `/product-price-update-orders/${id}`);
}

// Sales Manager phân công 1 Sales Staff cụ thể + gửi thông báo khách hàng bị ảnh hưởng.
export async function assignAndNotify(id, staffId) {
  return fetchWithToken('POST', `/product-price-update-orders/${id}/assign`, { staffId });
}

// Sales Staff thực hiện áp giá mới — chỉ được phép từ đúng ngày hiệu lực trở đi (BE chặn).
export async function executeOrder(id) {
  return fetchWithToken('POST', `/product-price-update-orders/${id}/execute`);
}

export async function cancelOrder(id, reason) {
  return fetchWithToken('POST', `/product-price-update-orders/${id}/cancel`, { reason });
}
