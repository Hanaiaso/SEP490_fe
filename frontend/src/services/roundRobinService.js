import { authFetch } from './httpClient';

async function request(method, url, body) {
  const res = await authFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null

  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    const errors = json.errors && typeof json.errors === 'object' ? Object.values(json.errors).flat().join(' ') : ''
    throw new Error(json.message || json.detail || errors || `Lỗi ${res.status}`)
  }

  return json
}

// ─── Quản lý Round-robin (MGR-02) ─────────────────────────────────────────────

/**
 * Trạng thái round-robin: participants, cursor, pause, lịch sử gán, số khách chưa gán.
 */
export async function getRoundRobinState() {
  return request('GET', '/sales/round-robin')
}

/**
 * Gán toàn bộ khách chưa có Sale phụ trách theo round-robin.
 * @returns {Promise<{ assignedCount, newCursorStaffId, assignments }>}
 */
export async function runRoundRobinAssign() {
  return request('POST', '/sales/round-robin')
}

/**
 * Cập nhật cấu hình round-robin (pause, cursor, bật/tắt participant).
 * @param {{ isPaused?: boolean, cursorStaffId?: string,
 *           participants?: { staffId: string, isActive: boolean }[] }} payload
 */
export async function updateRoundRobin(payload) {
  return request('PUT', '/sales/round-robin', payload)
}
