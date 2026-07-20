import { fetchWithToken } from './authService.js';

export async function getSuppliers() {
  return fetchWithToken('GET', '/Suppliers');
}

export async function getSupplierById(id) {
  return fetchWithToken('GET', `/Suppliers/${id}`);
}

export async function createSupplier(payload) {
  return fetchWithToken('POST', '/Suppliers', payload);
}

export async function updateSupplier(id, payload) {
  return fetchWithToken('PUT', `/Suppliers/${id}`, payload);
}
