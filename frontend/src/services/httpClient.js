// ─── fetch() dùng chung: gắn Bearer token + tự thử refresh-and-retry khi 401 ──────
//
// Trước đây mỗi service tự viết fetch() riêng kèm Authorization header thủ công,
// nên silent refresh (NFR-SEC02) chỉ hoạt động cho những service dùng authService.js.
// Khi access token hết hạn giữa phiên, mọi service khác (giỏ hàng, đơn hàng, kho,
// sales...) nhận 401 thẳng, không thử refresh — người dùng bị lỗi/đăng xuất oan dù
// refresh token còn hạn (DEF-L4-006 chỉ sửa đúng 1 chỗ, không phải toàn bộ).
//
// authFetch() gom đúng 1 lần logic refresh dùng chung cho MỌI service — mỗi service
// vẫn tự parse response (JSON/CSV/FormData...) và tự định hình lỗi như cũ, chỉ đổi
// nguồn Response từ fetch() thô sang authFetch().
import { API_BASE } from './apiBase';

// Nhiều request 401 đồng thời phải chờ chung đúng 1 lần refresh — backend xoay vòng
// (rotate) refresh token ở mỗi lần refresh nên refresh token cũ bị vô hiệu ngay sau
// lần refresh đầu tiên; nếu mỗi request tự refresh riêng, các lần sau sẽ dùng refresh
// token đã bị thu hồi và thất bại, đăng xuất oan một phiên hợp lệ.
let refreshPromise = null;

async function tryRefreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (!storedRefreshToken) return false;

    try {
      const res = await fetch(`${API_BASE}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });
      if (!res.ok) return false;

      const body = await res.json().catch(() => null);
      const accessToken = body?.data?.accessToken;
      const newRefreshToken = body?.data?.refreshToken;
      if (!accessToken) return false;

      localStorage.setItem('accessToken', accessToken);
      if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
      return true;
    } catch {
      return false;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

function clearSessionAndRedirectToLogin() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('authUser');
  window.location.href = '/login';
}

/**
 * fetch() có gắn sẵn Bearer token từ localStorage. Khi gặp 401: tự thử refresh
 * (dùng chung 1 lần cho mọi request đồng thời) rồi gọi lại request gốc đúng 1 lần.
 * Nếu vẫn 401 sau khi thử refresh (hoặc không refresh được) -> xoá phiên + về /login.
 *
 * KHÔNG tự parse response — trả nguyên Response để caller tự .json()/.text()/kiểm
 * tra status theo đúng nhu cầu của từng service (JSON, CSV export, 204 No Content...).
 *
 * @param {string} url - đường dẫn tương đối, vd '/cart' (tự nối với API_BASE)
 * @param {RequestInit} [init]
 * @returns {Promise<Response>}
 */
export async function authFetch(url, init = {}) {
  const buildHeaders = () => {
    const headers = { ...(init.headers || {}) };
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    return headers;
  };

  let res = await fetch(`${API_BASE}${url}`, { ...init, headers: buildHeaders() });

  if (res.status === 401 && (await tryRefreshAccessToken())) {
    res = await fetch(`${API_BASE}${url}`, { ...init, headers: buildHeaders() });
  }

  if (res.status === 401) {
    clearSessionAndRedirectToLogin();
  }

  return res;
}
