import { fetchWithToken } from './authService.js';

const API_BASE = '/api';

function buildQuery({ page = 1, pageSize = 20, entityName, action, actorUserId, searchQuery, fromDate, toDate } = {}) {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('pageSize', pageSize);
  if (entityName) params.set('entityName', entityName);
  if (action) params.set('action', action);
  if (actorUserId) params.set('actorUserId', actorUserId);
  if (searchQuery) params.set('searchQuery', searchQuery);
  if (fromDate) params.set('fromDate', fromDate);
  if (toDate) params.set('toDate', toDate);
  return params;
}

export async function searchAuditLogs(query) {
  return fetchWithToken('GET', `/admin/audit-logs?${buildQuery(query).toString()}`);
}

// Không dùng fetchWithToken vì response là file CSV, không phải JSON.
export async function exportAuditLogsCsv(query) {
  const accessToken = localStorage.getItem('accessToken');
  const headers = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE}/admin/audit-logs/export?${buildQuery(query).toString()}`, { headers });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    throw new Error(`Xuất CSV thất bại (Lỗi ${res.status})`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-logs-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
