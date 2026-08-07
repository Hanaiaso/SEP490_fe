const API_BASE = '/api';

async function fetchWithToken(method, url, body) {
  const accessToken = localStorage.getItem('accessToken');
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : {};

  if (!res.ok) {
    throw new Error(json.message || `Lỗi ${res.status}`);
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
